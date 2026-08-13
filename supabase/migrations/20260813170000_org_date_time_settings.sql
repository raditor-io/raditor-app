-- Org-wide date & time display settings: every dashboard timestamp renders
-- through lib/format-date.ts using these. Values are validated in the service
-- layer (date_format/time_format enums, IANA timezone).
-- down: alter table public.organizations drop column timezone, drop column date_format, drop column time_format;

alter table public.organizations
  add column timezone text not null default 'UTC',
  add column date_format text not null default 'mdy_slash',
  add column time_format text not null default '12h';
