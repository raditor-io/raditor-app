-- Rename websites → projects across the schema, following the product
-- decision that the entity is presented as "Project" everywhere. Applied as a
-- rename (not recreate) so RLS policies, data, and references carry over;
-- constraint/index/policy names are renamed too so nothing keeps the old
-- vocabulary. PROJECT.md §16 explicitly allows names to evolve in migrations.

-- --- Tables -------------------------------------------------------------------

alter table public.websites rename to projects;
alter table public.website_goals rename to project_goals;
alter table public.website_sources rename to project_sources;

-- --- Columns ------------------------------------------------------------------

alter table public.project_goals rename column website_id to project_id;
alter table public.project_sources rename column website_id to project_id;
alter table public.editor_agent_assignments rename column website_id to project_id;

-- --- Constraints --------------------------------------------------------------

alter table public.projects rename constraint websites_pkey to projects_pkey;
alter table public.projects rename constraint websites_organization_id_fkey to projects_organization_id_fkey;
alter table public.projects rename constraint websites_site_type_check to projects_site_type_check;
alter table public.projects rename constraint websites_interval_check to projects_interval_check;
alter table public.projects rename constraint websites_pr_mode_check to projects_pr_mode_check;
alter table public.projects rename constraint websites_max_suggestions_check to projects_max_suggestions_check;
alter table public.projects rename constraint websites_org_slug_uniq to projects_org_slug_uniq;

alter table public.project_goals rename constraint website_goals_pkey to project_goals_pkey;
alter table public.project_goals rename constraint website_goals_organization_id_fkey to project_goals_organization_id_fkey;
alter table public.project_goals rename constraint website_goals_website_id_fkey to project_goals_project_id_fkey;
alter table public.project_goals rename constraint website_goals_key_check to project_goals_key_check;

alter table public.project_sources rename constraint website_sources_pkey to project_sources_pkey;
alter table public.project_sources rename constraint website_sources_organization_id_fkey to project_sources_organization_id_fkey;
alter table public.project_sources rename constraint website_sources_website_id_fkey to project_sources_project_id_fkey;
alter table public.project_sources rename constraint website_sources_source_id_fkey to project_sources_source_id_fkey;
alter table public.project_sources rename constraint website_sources_uniq to project_sources_uniq;

alter table public.editor_agent_assignments
  rename constraint editor_agent_assignments_website_id_fkey
  to editor_agent_assignments_project_id_fkey;

-- --- Indexes ------------------------------------------------------------------

alter index public.websites_org_idx rename to projects_org_idx;
alter index public.website_goals_website_idx rename to project_goals_project_idx;
alter index public.website_sources_website_idx rename to project_sources_project_idx;
alter index public.website_sources_source_idx rename to project_sources_source_idx;

-- --- Policies -----------------------------------------------------------------

alter policy websites_select on public.projects rename to projects_select;
alter policy websites_insert on public.projects rename to projects_insert;
alter policy websites_update on public.projects rename to projects_update;
alter policy websites_delete on public.projects rename to projects_delete;

alter policy website_goals_select on public.project_goals rename to project_goals_select;
alter policy website_goals_insert on public.project_goals rename to project_goals_insert;
alter policy website_goals_update on public.project_goals rename to project_goals_update;
alter policy website_goals_delete on public.project_goals rename to project_goals_delete;

alter policy website_sources_select on public.project_sources rename to project_sources_select;
alter policy website_sources_insert on public.project_sources rename to project_sources_insert;
alter policy website_sources_delete on public.project_sources rename to project_sources_delete;
