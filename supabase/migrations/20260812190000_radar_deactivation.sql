-- Pause switch for radars: a deactivated radar stays configured and listed,
-- but scheduling and scan execution skip it. NULL = active.
-- (is_active remains the soft-delete flag; deactivated_at is reversible pause.)
-- down: alter table public.radars drop column deactivated_at;

alter table public.radars
  add column deactivated_at timestamptz;
