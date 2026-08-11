-- Phase 3: job queues (pgmq), radar runs + signals + evaluations,
-- suggestions, AI usage metering, and the BYOK credentials schema.
--
-- Queue wrappers live in public with a jobs_ prefix (PostgREST only exposes
-- the public schema by default); they are security definer and granted to
-- service_role only. Workers are Next.js route handlers drained by cron.

-- --- pgmq queues --------------------------------------------------------------

create extension if not exists pgmq;

select pgmq.create('default');
select pgmq.create('radar');

-- Enqueue a job envelope {job, payload}. Returns the message id.
create or replace function public.jobs_enqueue(p_queue text, p_message jsonb)
returns bigint
language sql
security definer
set search_path = public, pg_temp
as $$
  select pgmq.send(p_queue, p_message);
$$;

-- Read a batch with a visibility timeout (seconds). Unarchived messages
-- reappear after the timeout, which is the retry mechanism.
create or replace function public.jobs_read_batch(
  p_queue text,
  p_visibility_timeout integer,
  p_batch_size integer
)
returns table(
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select m.msg_id, m.read_ct, m.enqueued_at, m.vt, m.message
  from pgmq.read(p_queue, p_visibility_timeout, p_batch_size) m;
$$;

create or replace function public.jobs_archive(p_queue text, p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select pgmq.archive(p_queue, p_msg_id);
$$;

revoke all on function public.jobs_enqueue(text, jsonb) from public, anon, authenticated;
revoke all on function public.jobs_read_batch(text, integer, integer) from public, anon, authenticated;
revoke all on function public.jobs_archive(text, bigint) from public, anon, authenticated;
grant execute on function public.jobs_enqueue(text, jsonb) to service_role;
grant execute on function public.jobs_read_batch(text, integer, integer) to service_role;
grant execute on function public.jobs_archive(text, bigint) to service_role;

-- Dead letters after max attempts; written by the drain worker.
create table public.job_failures (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  job_name text not null,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  attempt_count integer not null default 0,
  failed_at timestamptz not null default now()
);

alter table public.job_failures enable row level security;

-- --- Radar runs ---------------------------------------------------------------

create table public.radar_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_kind text not null default 'tick',
  status text not null default 'running',
  stats jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint radar_runs_kind_check check (run_kind in ('tick', 'scheduled_reconcile')),
  constraint radar_runs_status_check check (status in ('running', 'succeeded', 'failed'))
);

create index radar_runs_org_idx on public.radar_runs (organization_id, started_at desc);

-- --- Signals (org-level, clustered once, fanned out per project) --------------

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  radar_run_id uuid references public.radar_runs(id) on delete set null,
  cluster_key text not null,
  title text not null,
  summary_md text not null default '',
  -- [{kind: 'release'|'pull_request'|'push'|'issue', url, title, external_ref}]
  evidence jsonb not null default '[]'::jsonb,
  window_started_at timestamptz not null default now(),
  window_ended_at timestamptz not null default now(),
  has_suspicious_content boolean not null default false,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signals_status_check check (status in ('open', 'closed')),
  constraint signals_cluster_uniq unique (organization_id, cluster_key)
);

create index signals_org_created_idx on public.signals (organization_id, created_at desc);

-- --- Per-project signal evaluations (radar debugging + eval substrate) --------

create table public.signal_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  signal_id uuid not null references public.signals(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  editor_agent_id uuid references public.editor_agents(id) on delete set null,
  status text not null default 'pending',
  relevance_score integer,
  rationale_md text not null default '',
  suggestion_id uuid,
  error_message text,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signal_evaluations_status_check check (
    status in ('pending', 'deferred', 'skipped_irrelevant', 'suggested', 'failed')
  ),
  constraint signal_evaluations_uniq unique (signal_id, project_id)
);

create index signal_evaluations_project_idx
  on public.signal_evaluations (project_id, created_at desc);

-- --- Suggestions (the four-part canonical shape) ------------------------------

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  editor_agent_id uuid references public.editor_agents(id) on delete set null,
  signal_id uuid references public.signals(id) on delete set null,
  -- Sibling suggestions from the same signal on other projects share this.
  sibling_group_id uuid,
  title text not null default '',
  signal_summary_md text not null default '',
  recommendation_md text not null default '',
  reason_md text not null default '',
  graph_impact jsonb not null default '{"operations": []}'::jsonb,
  status text not null default 'open',
  interval_bucket text not null,
  relevance_score integer,
  has_suspicious_source_content boolean not null default false,
  has_conflict boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suggestions_status_check check (
    status in ('open', 'elaborated', 'accepted', 'dismissed', 'expired')
  )
);

create index suggestions_project_status_idx
  on public.suggestions (project_id, status, created_at desc);
create index suggestions_org_status_idx
  on public.suggestions (organization_id, status, created_at desc);
create index suggestions_bucket_idx
  on public.suggestions (project_id, interval_bucket);
create index suggestions_sibling_idx on public.suggestions (sibling_group_id);

-- --- AI usage metering (cost per project from day one) ------------------------

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  editor_agent_id uuid references public.editor_agents(id) on delete set null,
  suggestion_id uuid references public.suggestions(id) on delete set null,
  capability text not null,
  provider text not null default 'venice',
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  is_byok boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ai_usage_capability_check check (
    capability in ('classify', 'summarize', 'write', 'translate', 'critic', 'judge')
  )
);

create index ai_usage_org_idx on public.ai_usage_events (organization_id, created_at desc);
create index ai_usage_project_idx on public.ai_usage_events (project_id, created_at desc);
create index ai_usage_suggestion_idx on public.ai_usage_events (suggestion_id);

-- --- BYOK provider credentials (schema now, vault UI in Phase 9) --------------

create table public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'venice',
  key_ciphertext text not null,
  key_iv text not null,
  key_last_four text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_credentials_org_provider_uniq unique (organization_id, provider)
);

-- --- updated_at triggers ------------------------------------------------------

create trigger signals_updated_at
  before update on public.signals
  for each row execute function public.handle_updated_at();

create trigger signal_evaluations_updated_at
  before update on public.signal_evaluations
  for each row execute function public.handle_updated_at();

create trigger suggestions_updated_at
  before update on public.suggestions
  for each row execute function public.handle_updated_at();

create trigger provider_credentials_updated_at
  before update on public.provider_credentials
  for each row execute function public.handle_updated_at();

-- --- RLS ----------------------------------------------------------------------

alter table public.radar_runs enable row level security;
alter table public.signals enable row level security;
alter table public.signal_evaluations enable row level security;
alter table public.suggestions enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.provider_credentials enable row level security;

-- Radar artifacts: members read; only jobs (service role) write.
create policy radar_runs_select on public.radar_runs
  for select to authenticated using (public.is_org_member(organization_id));

create policy signals_select on public.signals
  for select to authenticated using (public.is_org_member(organization_id));

create policy signal_evaluations_select on public.signal_evaluations
  for select to authenticated using (public.is_org_member(organization_id));

-- Suggestions: members read AND update (accept/dismiss/elaborate are
-- operational, member-level actions per the role model). Inserts come from
-- jobs via the service role only.
create policy suggestions_select on public.suggestions
  for select to authenticated using (public.is_org_member(organization_id));

create policy suggestions_update on public.suggestions
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- Usage metering: members read; service role writes.
create policy ai_usage_events_select on public.ai_usage_events
  for select to authenticated using (public.is_org_member(organization_id));

-- BYOK credentials: admin-only in every direction (ciphertext never reaches
-- non-admins; decryption happens server-side only).
create policy provider_credentials_select on public.provider_credentials
  for select to authenticated using (public.is_org_admin(organization_id));

create policy provider_credentials_insert on public.provider_credentials
  for insert to authenticated with check (public.is_org_admin(organization_id));

create policy provider_credentials_update on public.provider_credentials
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy provider_credentials_delete on public.provider_credentials
  for delete to authenticated using (public.is_org_admin(organization_id));
