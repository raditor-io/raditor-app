-- Fix: the repo-target dedupe was a PARTIAL unique index, which Postgres
-- cannot infer for the ON CONFLICT clause Supabase upserts emit (42P10).
-- A plain unique constraint behaves identically for our purposes (NULLs are
-- distinct, so multiple non-GitHub targets per radar stay legal) and is
-- inferable.

drop index public.radar_targets_repo_uniq;

alter table public.radar_targets
  add constraint radar_targets_repo_uniq unique (radar_id, github_repo_full_name);
