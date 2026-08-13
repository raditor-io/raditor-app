-- Per-radar testing/observability aid: when enabled, every scan emits its
-- summary as a signal (kind scan_summarized) through the normal
-- scan_outputs -> reconcile -> feeds pipeline.
-- down: alter table public.radars drop column emit_scan_summary_as_signal;

alter table public.radars
  add column emit_scan_summary_as_signal boolean not null default false;
