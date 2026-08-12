-- Phase 5: the content graph (a derived, rebuildable index over Git plus a
-- pending overlay for open suggestions), site profiles (Tier 1 plug'n'play),
-- and the dedicated graph queue.
--
-- Git is the single source of truth: indexed rows are rebuildable at any
-- time; pending rows belong to open suggestions and are promoted/flagged by
-- reconciliation, never silently merged (PROJECT.md §5.7).

select pgmq.create('graph');

-- Site profile (AI-derived, human-editable markdown briefing about how the
-- target site is built) + deploy-target warning set by the indexer.
alter table public.projects add column site_profile_md text not null default '';
alter table public.projects add column deploy_target_warning text;

-- site_profile joins the metered functionalities.
alter table public.ai_usage_events drop constraint ai_usage_functionality_check;
alter table public.ai_usage_events add constraint ai_usage_functionality_check check (
  functionality in (
    'scan_summary', 'scan_briefing', 'signal_evaluation',
    'content_suggestion', 'content_draft', 'site_profile', 'translation',
    'draft_critique', 'eval_judgement'
  )
);

-- --- Nodes: pages and marker-bounded sections ---------------------------------

create table public.content_nodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  node_type text not null default 'page',
  file_path text not null,
  -- '' for pages; the section name for marker-bounded section nodes. NOT
  -- NULL so the unique constraint stays upsert-inferable.
  marker_name text not null default '',
  url_path text,
  locale text,
  title text,
  description text,
  frontmatter jsonb not null default '{}'::jsonb,
  git_blob_sha text,
  graph_state text not null default 'indexed',
  suggestion_id uuid references public.suggestions(id) on delete cascade,
  has_conflict boolean not null default false,
  last_indexed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_nodes_type_check check (node_type in ('page', 'section')),
  constraint content_nodes_state_check check (graph_state in ('indexed', 'pending')),
  constraint content_nodes_uniq unique (project_id, file_path, marker_name, graph_state)
);

create index content_nodes_project_idx on public.content_nodes (project_id, graph_state);
create index content_nodes_url_idx on public.content_nodes (project_id, url_path);

-- --- Edges --------------------------------------------------------------------

create table public.content_edges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  edge_type text not null,
  from_node_id uuid not null references public.content_nodes(id) on delete cascade,
  -- Resolved target node; null for external or not-yet-resolved links, in
  -- which case to_url carries the raw target.
  to_node_id uuid references public.content_nodes(id) on delete cascade,
  to_url text,
  signal_id uuid references public.signals(id) on delete set null,
  graph_state text not null default 'indexed',
  created_at timestamptz not null default now(),
  constraint content_edges_type_check check (
    edge_type in ('links_to', 'part_of', 'localized_version_of', 'generated_from_signal')
  ),
  constraint content_edges_state_check check (graph_state in ('indexed', 'pending'))
);

create index content_edges_project_idx on public.content_edges (project_id, edge_type);
create index content_edges_from_idx on public.content_edges (from_node_id);
create index content_edges_to_idx on public.content_edges (to_node_id);

create trigger content_nodes_updated_at
  before update on public.content_nodes
  for each row execute function public.handle_updated_at();

-- --- RLS: members read; the indexer (service role) writes ---------------------

alter table public.content_nodes enable row level security;
alter table public.content_edges enable row level security;

create policy content_nodes_select on public.content_nodes
  for select to authenticated using (public.is_org_member(organization_id));

create policy content_edges_select on public.content_edges
  for select to authenticated using (public.is_org_member(organization_id));
