-- Phase 2: GitHub App installations, org-level sources, projects (websites),
-- goals, editor agents + assignments, and the raw source_events feed.
--
-- Role split (see 20260807100000_core.sql): reads for any org member,
-- configuration writes admin-only. source_events rows are written by the
-- webhook receiver via the service role only.
-- UI naming note: websites are presented as "Projects" and editor_agents as
-- "Editors"; table names follow PROJECT.md.

-- --- GitHub App installations -------------------------------------------------

create table public.github_installations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  github_installation_id bigint not null unique,
  github_account_login text not null,
  github_account_type text not null default 'Organization',
  is_active boolean not null default true,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index github_installations_org_idx
  on public.github_installations (organization_id);

-- --- Sources (org-level connections; projects subscribe) ----------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null default 'github_repo',
  display_name text not null,
  github_installation_id bigint,
  github_repo_full_name text,
  -- {is_watching_releases, is_watching_default_branch_merges,
  --  is_watching_labeled_issues, issue_labels: [], path_filters: []}
  watch_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_type_check check (source_type in ('github_repo')),
  constraint sources_repo_uniq unique (organization_id, github_repo_full_name)
);

create index sources_org_idx on public.sources (organization_id);
create index sources_repo_idx on public.sources (github_repo_full_name);

-- --- Websites (presented as Projects) -----------------------------------------

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  slug text not null,
  site_type text not null default 'general',
  purpose_md text not null default '',
  do_not_write_md text not null default '',
  editorial_memory_md text not null default '',
  suggestion_interval text not null default 'weekly',
  max_suggestions_per_interval integer not null default 3,
  deploy_github_installation_id bigint,
  deploy_repo_full_name text,
  deploy_base_branch text not null default 'main',
  deploy_path_allowlist text[] not null default '{}',
  deploy_pr_mode text not null default 'direct',
  url_mapping_config jsonb not null default '[]'::jsonb,
  i18n_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint websites_site_type_check
    check (site_type in ('general', 'blog', 'help_center', 'documentation')),
  constraint websites_interval_check
    check (suggestion_interval in ('daily', 'weekly', 'monthly')),
  constraint websites_pr_mode_check check (deploy_pr_mode in ('direct', 'fork')),
  constraint websites_max_suggestions_check check (max_suggestions_per_interval > 0),
  constraint websites_org_slug_uniq unique (organization_id, slug)
);

create index websites_org_idx on public.websites (organization_id);

-- --- Website goals ------------------------------------------------------------

create table public.website_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  -- Predefined goals carry a key; custom goals have goal_key null.
  goal_key text,
  title text not null,
  body_md text not null default '',
  is_active boolean not null default true,
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_goals_key_check check (
    goal_key is null or goal_key in
      ('ship_product_changes', 'grow_content_graph', 'improve_ai_answer_visibility')
  )
);

create index website_goals_website_idx on public.website_goals (website_id);

-- --- Website ↔ source subscriptions -------------------------------------------

create table public.website_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint website_sources_uniq unique (website_id, source_id)
);

create index website_sources_website_idx on public.website_sources (website_id);
create index website_sources_source_idx on public.website_sources (source_id);

-- --- Editor agents (presented as Editors) + assignments -----------------------

create table public.editor_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  persona_md text not null default '',
  -- {routing: {capability: model}, is_challenge_mode_enabled}
  model_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index editor_agents_org_idx on public.editor_agents (organization_id);

create table public.editor_agent_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  editor_agent_id uuid not null references public.editor_agents(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint editor_agent_assignments_uniq unique (editor_agent_id, website_id)
);

create index editor_agent_assignments_website_idx
  on public.editor_agent_assignments (website_id);

-- --- Raw source events (webhook + reconcile feed for the radar) ---------------

create table public.source_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  event_kind text not null,
  -- Stable identifier within the source (tag, PR number, head sha, issue
  -- number); with source_id it makes webhook redelivery idempotent.
  external_ref text not null,
  github_delivery_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  signal_id uuid,
  is_processed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint source_events_kind_check check (event_kind in
    ('release_published', 'pull_request_merged', 'push_default_branch', 'issue_labeled')),
  constraint source_events_ref_uniq unique (source_id, external_ref)
);

create index source_events_org_unprocessed_idx
  on public.source_events (organization_id, is_processed, occurred_at);

-- --- updated_at triggers ------------------------------------------------------

create trigger github_installations_updated_at
  before update on public.github_installations
  for each row execute function public.handle_updated_at();

create trigger sources_updated_at
  before update on public.sources
  for each row execute function public.handle_updated_at();

create trigger websites_updated_at
  before update on public.websites
  for each row execute function public.handle_updated_at();

create trigger website_goals_updated_at
  before update on public.website_goals
  for each row execute function public.handle_updated_at();

create trigger editor_agents_updated_at
  before update on public.editor_agents
  for each row execute function public.handle_updated_at();

-- --- RLS ----------------------------------------------------------------------

alter table public.github_installations enable row level security;
alter table public.sources enable row level security;
alter table public.websites enable row level security;
alter table public.website_goals enable row level security;
alter table public.website_sources enable row level security;
alter table public.editor_agents enable row level security;
alter table public.editor_agent_assignments enable row level security;
alter table public.source_events enable row level security;

-- Reads: any org member. Config writes: admins. Webhook-maintained tables
-- (github_installations, source_events) are written by the service role only.

create policy github_installations_select on public.github_installations
  for select to authenticated using (public.is_org_member(organization_id));

create policy sources_select on public.sources
  for select to authenticated using (public.is_org_member(organization_id));
create policy sources_insert on public.sources
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy sources_update on public.sources
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy sources_delete on public.sources
  for delete to authenticated using (public.is_org_admin(organization_id));

create policy websites_select on public.websites
  for select to authenticated using (public.is_org_member(organization_id));
create policy websites_insert on public.websites
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy websites_update on public.websites
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy websites_delete on public.websites
  for delete to authenticated using (public.is_org_admin(organization_id));

create policy website_goals_select on public.website_goals
  for select to authenticated using (public.is_org_member(organization_id));
create policy website_goals_insert on public.website_goals
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy website_goals_update on public.website_goals
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy website_goals_delete on public.website_goals
  for delete to authenticated using (public.is_org_admin(organization_id));

create policy website_sources_select on public.website_sources
  for select to authenticated using (public.is_org_member(organization_id));
create policy website_sources_insert on public.website_sources
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy website_sources_delete on public.website_sources
  for delete to authenticated using (public.is_org_admin(organization_id));

create policy editor_agents_select on public.editor_agents
  for select to authenticated using (public.is_org_member(organization_id));
create policy editor_agents_insert on public.editor_agents
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy editor_agents_update on public.editor_agents
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy editor_agents_delete on public.editor_agents
  for delete to authenticated using (public.is_org_admin(organization_id));

create policy editor_agent_assignments_select on public.editor_agent_assignments
  for select to authenticated using (public.is_org_member(organization_id));
create policy editor_agent_assignments_insert on public.editor_agent_assignments
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy editor_agent_assignments_delete on public.editor_agent_assignments
  for delete to authenticated using (public.is_org_admin(organization_id));

create policy source_events_select on public.source_events
  for select to authenticated using (public.is_org_member(organization_id));
