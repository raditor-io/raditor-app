-- Core platform schema: multi-user organizations (roles admin|user), email
-- invitations, and the append-only audit event log.
--
-- Role model: admins make configuration changes (websites, sources, agents,
-- policies, members, keys); users perform operational tasks (reviewing
-- suggestions, feedback). Enforced here via RLS and mirrored in the app
-- service layer.
--
-- Memberships are only ever created by the security-definer functions below
-- (bootstrap_organization, accept_invitation) so the invite flow is the single
-- door into an organization.

-- --- Shared updated_at trigger function --------------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- Tables ------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Denormalized from auth.users at join time (auth schema is not readable
  -- through PostgREST): display data for the members list.
  member_email text,
  member_role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_role_check check (member_role in ('admin', 'user')),
  constraint organization_memberships_org_user_uniq unique (organization_id, user_id)
);

create index organization_memberships_user_idx
  on public.organization_memberships (user_id);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  member_role text not null default 'user',
  -- SHA-256 hex of the raw invite token; the raw token only ever lives in the
  -- emailed link.
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invitations_role_check check (member_role in ('admin', 'user'))
);

-- One pending invitation per (org, email); accepted ones drop out of the way.
create unique index organization_invitations_pending_uniq
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null;

-- Append-only audit log powering webhooks and the public events API. No
-- update/delete policies exist and none should ever be added; inserts happen
-- via the service role or the definer functions below.
create table public.events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  subject_type text,
  subject_id text,
  actor_kind text not null default 'system',
  actor_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint events_actor_kind_check check (actor_kind in ('user', 'agent', 'system'))
);

create index events_org_created_idx on public.events (organization_id, created_at desc);
create index events_org_type_idx on public.events (organization_id, event_type);

-- --- updated_at triggers ------------------------------------------------------

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.handle_updated_at();

create trigger organization_memberships_updated_at
  before update on public.organization_memberships
  for each row execute function public.handle_updated_at();

create trigger organization_invitations_updated_at
  before update on public.organization_invitations
  for each row execute function public.handle_updated_at();

-- --- Role helpers -------------------------------------------------------------

-- Security definer so RLS policies on organization_memberships can call them
-- without recursing into their own policies.

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.member_role = 'admin'
  );
$$;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.is_org_admin(uuid) to authenticated, service_role;

-- --- RLS ----------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.events enable row level security;

create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- Memberships: readable by members. No insert policy on purpose (creation
-- goes through the definer functions). Admins manage roles and removal;
-- members may remove themselves (leave).
create policy organization_memberships_select on public.organization_memberships
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy organization_memberships_update on public.organization_memberships
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy organization_memberships_delete on public.organization_memberships
  for delete to authenticated
  using (public.is_org_admin(organization_id) or user_id = auth.uid());

-- Invitations: admin-only in every direction. The invite acceptance page
-- reads via the service role (token lookup), not through these policies.
create policy organization_invitations_select on public.organization_invitations
  for select to authenticated
  using (public.is_org_admin(organization_id));

create policy organization_invitations_insert on public.organization_invitations
  for insert to authenticated
  with check (public.is_org_admin(organization_id));

create policy organization_invitations_update on public.organization_invitations
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy organization_invitations_delete on public.organization_invitations
  for delete to authenticated
  using (public.is_org_admin(organization_id));

-- Events: members read their org's audit trail; nobody updates or deletes.
create policy events_select on public.events
  for select to authenticated
  using (public.is_org_member(organization_id));

-- --- Bootstrap: first login ---------------------------------------------------

-- Called with the user's session after sign-in. Order of precedence:
--   1. an existing membership wins (returns that org),
--   2. a pending invitation matching the verified login email is accepted,
--   3. otherwise a fresh organization is created with the caller as admin.
create or replace function public.bootstrap_organization()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_org_id uuid;
  v_invitation public.organization_invitations%rowtype;
  v_name text;
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'bootstrap_organization: not authenticated';
  end if;

  select m.organization_id into v_org_id
  from public.organization_memberships m
  where m.user_id = v_user_id
  order by m.created_at
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;

  select i.* into v_invitation
  from public.organization_invitations i
  where lower(i.email) = lower(coalesce(v_email, ''))
    and i.accepted_at is null
    and i.expires_at > now()
  order by i.created_at desc
  limit 1;

  if v_invitation.id is not null then
    insert into public.organization_memberships (organization_id, user_id, member_email, member_role)
    values (v_invitation.organization_id, v_user_id, v_email, v_invitation.member_role)
    on conflict (organization_id, user_id) do nothing;

    update public.organization_invitations
    set accepted_at = now()
    where id = v_invitation.id;

    insert into public.events
      (organization_id, event_type, subject_type, subject_id, actor_kind, actor_id, payload)
    values
      (v_invitation.organization_id, 'member_joined', 'organization_membership',
       v_user_id::text, 'user', v_user_id,
       jsonb_build_object('via', 'invitation', 'member_role', v_invitation.member_role));

    return v_invitation.organization_id;
  end if;

  v_name := coalesce(nullif(split_part(coalesce(v_email, ''), '@', 1), ''), 'workspace');
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.organizations (display_name, slug)
  values (v_name, v_slug)
  returning id into v_org_id;

  insert into public.organization_memberships (organization_id, user_id, member_email, member_role)
  values (v_org_id, v_user_id, v_email, 'admin');

  insert into public.events
    (organization_id, event_type, subject_type, subject_id, actor_kind, actor_id, payload)
  values
    (v_org_id, 'organization_created', 'organization', v_org_id::text, 'user', v_user_id, '{}'::jsonb);

  return v_org_id;
end;
$$;

revoke all on function public.bootstrap_organization() from public, anon;
grant execute on function public.bootstrap_organization() to authenticated, service_role;

-- --- Invitation acceptance (explicit token link) ------------------------------

-- Called with the user's session from the /invite/<token> page; the app hashes
-- the raw token (SHA-256 hex) before calling. The invited email must match the
-- caller's verified login email.
create or replace function public.accept_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invitation public.organization_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'accept_invitation: not authenticated';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;

  select i.* into v_invitation
  from public.organization_invitations i
  where i.token_hash = p_token_hash
    and i.accepted_at is null
    and i.expires_at > now()
  for update;

  if v_invitation.id is null then
    raise exception 'invitation_invalid';
  end if;

  if lower(v_invitation.email) <> lower(coalesce(v_email, '')) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.organization_memberships (organization_id, user_id, member_email, member_role)
  values (v_invitation.organization_id, v_user_id, v_email, v_invitation.member_role)
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invitations
  set accepted_at = now()
  where id = v_invitation.id;

  insert into public.events
    (organization_id, event_type, subject_type, subject_id, actor_kind, actor_id, payload)
  values
    (v_invitation.organization_id, 'member_joined', 'organization_membership',
     v_user_id::text, 'user', v_user_id,
     jsonb_build_object('via', 'invitation_link', 'member_role', v_invitation.member_role));

  return v_invitation.organization_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated, service_role;
