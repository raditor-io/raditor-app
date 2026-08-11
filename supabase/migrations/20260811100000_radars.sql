-- Scan-centric radar rework (see plan Phase 7 + memory radar-scan-centric-design):
-- sources/subscriptions become project-bound radars with targets; webhook
-- events land in a raw inbox (radar_target_events); scans are the only
-- interpretation stage and always produce scan_outputs, which reconciliation
-- dedupes org-wide into signals. Downstream (signals, evaluations,
-- suggestions) is untouched.
--
-- Data migration: one radar per (source x subscribed project); source_events
-- had no rows worth carrying (dev/prod both pre-launch), so the inbox starts
-- empty. radar_runs is replaced by scans (fresh history).

-- --- Radars (the mission; project-bound) --------------------------------------

create table public.radars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  directive_md text not null default '',
  -- Enabled set: ai_briefing | fetched_websites | source_emitted_events.
  -- ai_briefing / fetched_websites execute from Phase 7; declaring them is
  -- already valid.
  scan_strategies text[] not null default '{source_emitted_events}',
  scan_interval_minutes integer not null default 30,
  last_scanned_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint radars_interval_check check (scan_interval_minutes >= 5)
);

create index radars_project_idx on public.radars (project_id);
create index radars_org_idx on public.radars (organization_id);

-- --- Radar targets (the watched things; emitters bind here) -------------------

create table public.radar_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  radar_id uuid not null references public.radars(id) on delete cascade,
  target_kind text not null,
  -- Webhook routing columns (github_repo targets only, indexed):
  github_installation_id bigint,
  github_repo_full_name text,
  -- Kind-specific config: repo watch flags, {url}, {query}, {handle}.
  config jsonb not null default '{}'::jsonb,
  -- Per-target structured-intake state (last sha, feed item id, content hash).
  scan_checkpoint jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint radar_targets_kind_check check (
    target_kind in ('github_repo', 'website_url', 'search_query', 'social_handle')
  )
);

create index radar_targets_radar_idx on public.radar_targets (radar_id);
create index radar_targets_repo_routing_idx
  on public.radar_targets (github_installation_id, github_repo_full_name);
create unique index radar_targets_repo_uniq
  on public.radar_targets (radar_id, github_repo_full_name)
  where github_repo_full_name is not null;

-- --- Raw event inbox (source_emitted_events strategy) -------------------------

create table public.radar_target_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  radar_id uuid not null references public.radars(id) on delete cascade,
  radar_target_id uuid not null references public.radar_targets(id) on delete cascade,
  event_kind text not null,
  external_ref text not null,
  -- {title, body, url, data} - normalized by the mechanical webhook parser.
  payload jsonb not null default '{}'::jsonb,
  delivery_ref text,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  consumed_by_scan_id uuid,
  constraint radar_target_events_ref_uniq unique (radar_target_id, external_ref)
);

create index radar_target_events_unconsumed_idx
  on public.radar_target_events (radar_id)
  where consumed_by_scan_id is null;

-- --- Scans (the only interpretation stage) ------------------------------------

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  radar_id uuid not null references public.radars(id) on delete cascade,
  trigger text not null default 'interval',
  strategies_used text[] not null default '{}',
  status text not null default 'running',
  stats jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint scans_trigger_check check (trigger in ('interval', 'target_events')),
  constraint scans_status_check check (status in ('running', 'succeeded', 'failed'))
);

create index scans_radar_idx on public.scans (radar_id, started_at desc);

alter table public.radar_target_events
  add constraint radar_target_events_consumed_fk
  foreign key (consumed_by_scan_id) references public.scans(id) on delete set null;

-- --- Scan outputs (every scan's product; pre-signal) --------------------------

create table public.scan_outputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  radar_id uuid not null references public.radars(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  radar_target_id uuid references public.radar_targets(id) on delete set null,
  output_kind text not null,
  external_ref text not null,
  title text not null,
  body text,
  url text,
  -- Strategy extras + provenance (data.source_event_ids for consumed inbox rows).
  data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  signal_id uuid references public.signals(id) on delete set null,
  is_reconciled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint scan_outputs_ref_uniq unique (radar_id, external_ref)
);

create index scan_outputs_unreconciled_idx
  on public.scan_outputs (organization_id)
  where is_reconciled = false;

-- --- Retire the old structure -------------------------------------------------

-- Migrate: one radar per (source x subscribed project), carrying the repo as
-- a github_repo target with the old watch flags.
insert into public.radars
  (organization_id, project_id, name, directive_md, scan_strategies)
select
  s.organization_id,
  ps.project_id,
  s.display_name,
  'Watch the GitHub repository ' || coalesce(s.github_repo_full_name, s.display_name)
    || ' for releases, merged changes, and labeled issues relevant to this project.',
  '{source_emitted_events}'
from public.sources s
join public.project_sources ps on ps.source_id = s.id
where s.is_active;

insert into public.radar_targets
  (organization_id, radar_id, target_kind, github_installation_id,
   github_repo_full_name, config)
select
  r.organization_id,
  r.id,
  'github_repo',
  s.github_installation_id,
  s.github_repo_full_name,
  s.watch_config
from public.radars r
join public.sources s
  on s.organization_id = r.organization_id
 and ('Watch the GitHub repository ' || coalesce(s.github_repo_full_name, s.display_name)
      || ' for releases, merged changes, and labeled issues relevant to this project.') = r.directive_md;

alter table public.signals drop column if exists radar_run_id;

drop table public.source_events;
drop table public.project_sources;
drop table public.sources;
drop table public.radar_runs;

-- --- ai_usage_events: scans are first-class metered spend ---------------------

alter table public.ai_usage_events add column scan_id uuid;
alter table public.ai_usage_events drop constraint ai_usage_capability_check;
alter table public.ai_usage_events add constraint ai_usage_capability_check check (
  capability in ('classify', 'summarize', 'write', 'translate', 'critic', 'judge', 'scan')
);

-- --- updated_at triggers ------------------------------------------------------

create trigger radars_updated_at
  before update on public.radars
  for each row execute function public.handle_updated_at();

create trigger radar_targets_updated_at
  before update on public.radar_targets
  for each row execute function public.handle_updated_at();

-- --- RLS ----------------------------------------------------------------------

alter table public.radars enable row level security;
alter table public.radar_targets enable row level security;
alter table public.radar_target_events enable row level security;
alter table public.scans enable row level security;
alter table public.scan_outputs enable row level security;

create policy radars_select on public.radars
  for select to authenticated using (public.is_org_member(organization_id));
create policy radars_insert on public.radars
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy radars_update on public.radars
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy radars_delete on public.radars
  for delete to authenticated using (public.is_org_admin(organization_id));

create policy radar_targets_select on public.radar_targets
  for select to authenticated using (public.is_org_member(organization_id));
create policy radar_targets_insert on public.radar_targets
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy radar_targets_update on public.radar_targets
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy radar_targets_delete on public.radar_targets
  for delete to authenticated using (public.is_org_admin(organization_id));

-- Inbox, scans, outputs: members read; only jobs (service role) write.
create policy radar_target_events_select on public.radar_target_events
  for select to authenticated using (public.is_org_member(organization_id));

create policy scans_select on public.scans
  for select to authenticated using (public.is_org_member(organization_id));

create policy scan_outputs_select on public.scan_outputs
  for select to authenticated using (public.is_org_member(organization_id));
