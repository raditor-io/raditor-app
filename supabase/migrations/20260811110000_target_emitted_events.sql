-- Vocabulary fix: the emitter in the scan-centric model is the TARGET, not a
-- "source" (that concept is gone). Rename the scan strategy value
-- source_emitted_events -> target_emitted_events in defaults and data.

alter table public.radars
  alter column scan_strategies set default '{target_emitted_events}';

update public.radars
set scan_strategies = array_replace(scan_strategies, 'source_emitted_events', 'target_emitted_events')
where 'source_emitted_events' = any(scan_strategies);

update public.scans
set strategies_used = array_replace(strategies_used, 'source_emitted_events', 'target_emitted_events')
where 'source_emitted_events' = any(strategies_used);
