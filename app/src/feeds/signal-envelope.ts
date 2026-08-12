/**
 * The canonical signal wire shape shared by every transport (webhook push,
 * pull API, in-app rendering later): the standard envelope only — heavy or
 * internal columns (scan_id, dedup_key, custom_data, signed_event) stay off
 * the wire.
 */

export interface SignalEvidenceEntry {
  url?: string | null;
  title?: string | null;
  publisher?: string | null;
  kind?: string | null;
  external_ref?: string | null;
}

export interface SignalEnvelope {
  id: string;
  radar_id: string;
  kind: string;
  title: string;
  summary_md: string;
  body_md: string;
  evidence: SignalEvidenceEntry[];
  occurred_at: string;
}

export interface SignalEnvelopeSource {
  id: string;
  radar_id: string;
  kind: string;
  title: string;
  summary_md: string;
  body_md: string;
  evidence: unknown;
  occurred_at: string;
}

export function buildSignalEnvelope(
  signal: SignalEnvelopeSource,
): SignalEnvelope {
  return {
    id: signal.id,
    radar_id: signal.radar_id,
    kind: signal.kind,
    title: signal.title,
    summary_md: signal.summary_md,
    body_md: signal.body_md,
    evidence: Array.isArray(signal.evidence)
      ? (signal.evidence as SignalEvidenceEntry[])
      : [],
    occurred_at: signal.occurred_at,
  };
}
