-- Phase 4: accept -> drafts -> PR. Drafted file contents, PR tracking, and
-- the dedicated publish queue (each queue gets its own domain route:
-- /api/jobs/publish/process). The unused 'default' queue is dropped.

select pgmq.create('publish');
select pgmq.drop_queue('default');

create table public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  file_path text not null,
  draft_content text not null default '',
  -- Blob sha of the file on the base branch when drafted (null = new file);
  -- committed sha set when the PR branch is pushed. Phase 8 compares the
  -- merged blob against committed_git_blob_sha for edit-diff capture.
  base_git_blob_sha text,
  committed_git_blob_sha text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_drafts_path_uniq unique (suggestion_id, file_path)
);

create index content_drafts_suggestion_idx on public.content_drafts (suggestion_id);

create table public.github_pull_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  repo_full_name text not null,
  pr_number integer not null,
  branch_name text not null,
  head_commit_sha text,
  status text not null default 'open',
  is_from_fork boolean not null default false,
  opened_at timestamptz not null default now(),
  merged_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint github_pull_requests_status_check check (status in ('open', 'merged', 'closed')),
  constraint github_pull_requests_uniq unique (repo_full_name, pr_number)
);

create index github_pull_requests_suggestion_idx
  on public.github_pull_requests (suggestion_id);
create index github_pull_requests_project_idx
  on public.github_pull_requests (project_id, opened_at desc);

create trigger content_drafts_updated_at
  before update on public.content_drafts
  for each row execute function public.handle_updated_at();

create trigger github_pull_requests_updated_at
  before update on public.github_pull_requests
  for each row execute function public.handle_updated_at();

-- RLS: members read; only publish jobs (service role) write.
alter table public.content_drafts enable row level security;
alter table public.github_pull_requests enable row level security;

create policy content_drafts_select on public.content_drafts
  for select to authenticated using (public.is_org_member(organization_id));

create policy github_pull_requests_select on public.github_pull_requests
  for select to authenticated using (public.is_org_member(organization_id));
