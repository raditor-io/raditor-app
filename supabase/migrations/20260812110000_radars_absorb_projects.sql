-- Radars absorb projects: the radar is now the org-bound, top-level unit
-- ("one matter being monitored"). The projects table dies with its CMS
-- columns; name + directive_md already carry the radar's mission. The raw
-- inbox is renamed radar_target_events -> target_events. Rename-in-place
-- follows the 20260810120000_rename_websites_to_projects precedent.

-- --- Radar slug (org-unique, backfilled from name) ----------------------------

alter table public.radars add column slug text;

update public.radars r
set slug = sub.slug
from (
  select id,
    case
      when row_number() over (partition by organization_id, base order by created_at) = 1
        then base
      else base || '-' || substr(id::text, 1, 8)
    end as slug
  from (
    select id, organization_id, created_at,
      coalesce(
        nullif(left(trim(both '-' from
          lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))), 50), ''),
        'radar'
      ) as base
    from public.radars
  ) b
) sub
where sub.id = r.id;

alter table public.radars alter column slug set not null;
alter table public.radars
  add constraint radars_org_slug_uniq unique (organization_id, slug);

-- --- Detach radars from projects, drop projects -------------------------------

drop index public.radars_project_idx;
alter table public.radars drop column project_id;
alter table public.ai_usage_events drop column project_id;
drop table public.projects;

-- --- Rename the raw inbox: radar_target_events -> target_events ---------------

alter table public.radar_target_events rename to target_events;

alter table public.target_events
  rename constraint radar_target_events_pkey to target_events_pkey;
alter table public.target_events
  rename constraint radar_target_events_organization_id_fkey
  to target_events_organization_id_fkey;
alter table public.target_events
  rename constraint radar_target_events_radar_id_fkey
  to target_events_radar_id_fkey;
alter table public.target_events
  rename constraint radar_target_events_radar_target_id_fkey
  to target_events_radar_target_id_fkey;
alter table public.target_events
  rename constraint radar_target_events_ref_uniq to target_events_ref_uniq;
alter table public.target_events
  rename constraint radar_target_events_consumed_fk to target_events_consumed_fk;

alter index public.radar_target_events_unconsumed_idx
  rename to target_events_unconsumed_idx;

alter policy radar_target_events_select on public.target_events
  rename to target_events_select;
