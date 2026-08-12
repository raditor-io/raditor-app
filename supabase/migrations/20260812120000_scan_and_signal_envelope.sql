-- Scans always record an outcome (summary_md even for zero-signal scans,
-- error_message on failure). Signals become radar-bound standard envelopes
-- (kind / title / summary_md / body_md / evidence / occurred_at) deduped per
-- radar on dedup_key; cross-radar collection is the feeds layer's job now,
-- not org-wide reconciliation. custom_data (per-radar custom formats) and
-- signed_event (nostr signing) are reserved for post-MVP.

-- --- Scans: outcome fields ----------------------------------------------------

alter table public.scans add column summary_md text not null default '';
alter table public.scans add column error_message text;

-- --- Signals: rebuild as radar-bound envelopes --------------------------------
-- Pre-envelope signals are disposable (pre-launch). scan_outputs.signal_id is
-- on delete set null; reconciled outputs keep is_reconciled = true and are
-- deliberately not re-promoted.

delete from public.signals;

alter table public.signals add column radar_id uuid not null
  references public.radars(id) on delete cascade;
alter table public.signals add column kind text not null;
alter table public.signals add column body_md text not null default '';
alter table public.signals add column occurred_at timestamptz not null default now();
alter table public.signals add column custom_data jsonb;
alter table public.signals add column signed_event jsonb;
alter table public.signals drop column window_started_at;
alter table public.signals drop column window_ended_at;

alter table public.signals rename column cluster_key to dedup_key;
alter table public.signals drop constraint signals_cluster_uniq;
alter table public.signals
  add constraint signals_dedup_uniq unique (radar_id, dedup_key);

create index signals_radar_created_idx
  on public.signals (radar_id, created_at desc);
