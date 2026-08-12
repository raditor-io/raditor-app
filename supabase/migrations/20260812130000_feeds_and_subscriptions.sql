-- The feeds layer: a feed collects signals from one or more radars
-- (feed_radars, optional kind filter) into feed_items (bigint identity = the
-- pull cursor). Subscribers consume feeds: web services (pushed_webhook),
-- agents (pulled_feed: Bearer token + cursor ack), users (in_app).
-- feed_item_deliveries is the push attempt/ack log. Feeds are org-private in
-- the MVP; visibility 'public' is reserved for the publishing layer.

-- --- Delivery queue (one queue, one worker route) -----------------------------

select pgmq.create('deliver');

-- --- Feeds --------------------------------------------------------------------

create table public.feeds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description_md text not null default '',
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feeds_visibility_check check (visibility in ('private', 'public')),
  constraint feeds_org_slug_uniq unique (organization_id, slug)
);

create index feeds_org_idx on public.feeds (organization_id);

create table public.feed_radars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feed_id uuid not null references public.feeds(id) on delete cascade,
  radar_id uuid not null references public.radars(id) on delete cascade,
  -- Envelope-level filter: which signal kinds this feed takes from the radar.
  -- Null/empty = all kinds.
  signal_kinds text[],
  created_at timestamptz not null default now(),
  constraint feed_radars_uniq unique (feed_id, radar_id)
);

create index feed_radars_radar_idx on public.feed_radars (radar_id);

create table public.feed_items (
  -- Monotonic per insert; the pull API cursor.
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feed_id uuid not null references public.feeds(id) on delete cascade,
  signal_id uuid not null references public.signals(id) on delete cascade,
  added_at timestamptz not null default now(),
  constraint feed_items_uniq unique (feed_id, signal_id)
);

create index feed_items_feed_idx on public.feed_items (feed_id, id);

-- --- Subscriptions ------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feed_id uuid not null references public.feeds(id) on delete cascade,
  name text not null,
  subscriber_kind text not null,
  transport text not null,
  -- pushed_webhook: destination + AES-GCM-sealed signing secret.
  webhook_url text,
  webhook_secret_ciphertext text,
  webhook_secret_iv text,
  -- pulled_feed: hashed API token + consumer cursor (0 = from the beginning).
  api_token_hash text,
  api_token_prefix text,
  last_acked_feed_item_id bigint not null default 0,
  -- in_app: the subscribing member.
  user_id uuid references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_subscriber_kind_check
    check (subscriber_kind in ('web_service', 'agent', 'user')),
  constraint subscriptions_transport_check
    check (transport in ('pushed_webhook', 'pulled_feed', 'in_app')),
  constraint subscriptions_webhook_url_check
    check (transport <> 'pushed_webhook' or webhook_url is not null),
  constraint subscriptions_token_check
    check (transport <> 'pulled_feed' or api_token_hash is not null),
  constraint subscriptions_in_app_user_check
    check (transport <> 'in_app' or user_id is not null)
);

create index subscriptions_feed_idx on public.subscriptions (feed_id);
create unique index subscriptions_token_uniq
  on public.subscriptions (api_token_hash)
  where api_token_hash is not null;
create unique index subscriptions_in_app_uniq
  on public.subscriptions (feed_id, user_id)
  where transport = 'in_app';

-- --- Delivery log (pushed_webhook attempts) -----------------------------------

create table public.feed_item_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  feed_item_id bigint not null references public.feed_items(id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  delivered_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint feed_item_deliveries_status_check
    check (status in ('pending', 'delivered', 'failed')),
  constraint feed_item_deliveries_uniq unique (subscription_id, feed_item_id)
);

create index feed_item_deliveries_sub_idx
  on public.feed_item_deliveries (subscription_id, created_at desc);

-- --- updated_at triggers ------------------------------------------------------

create trigger feeds_updated_at before update on public.feeds
  for each row execute function public.handle_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- --- RLS ----------------------------------------------------------------------

alter table public.feeds enable row level security;
alter table public.feed_radars enable row level security;
alter table public.feed_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.feed_item_deliveries enable row level security;

-- Feeds + feed_radars: members read, admins configure.
create policy feeds_select on public.feeds
  for select to authenticated using (public.is_org_member(organization_id));
create policy feeds_insert on public.feeds
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy feeds_update on public.feeds
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy feeds_delete on public.feeds
  for delete to authenticated using (public.is_org_admin(organization_id));

create policy feed_radars_select on public.feed_radars
  for select to authenticated using (public.is_org_member(organization_id));
create policy feed_radars_insert on public.feed_radars
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy feed_radars_update on public.feed_radars
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy feed_radars_delete on public.feed_radars
  for delete to authenticated using (public.is_org_admin(organization_id));

-- Feed items + deliveries: members read; only jobs (service role) write.
-- Secret columns on subscriptions are ciphertext/hashes, safe under member
-- SELECT; UI services still select non-secret columns explicitly.
create policy feed_items_select on public.feed_items
  for select to authenticated using (public.is_org_member(organization_id));
create policy feed_item_deliveries_select on public.feed_item_deliveries
  for select to authenticated using (public.is_org_member(organization_id));

-- Subscriptions: members read; admins manage all; members self-manage their
-- own in_app subscription rows.
create policy subscriptions_select on public.subscriptions
  for select to authenticated using (public.is_org_member(organization_id));
create policy subscriptions_insert on public.subscriptions
  for insert to authenticated with check (
    public.is_org_admin(organization_id)
    or (
      public.is_org_member(organization_id)
      and transport = 'in_app'
      and user_id = auth.uid()
    )
  );
create policy subscriptions_update on public.subscriptions
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy subscriptions_delete on public.subscriptions
  for delete to authenticated using (
    public.is_org_admin(organization_id)
    or (transport = 'in_app' and user_id = auth.uid())
  );
