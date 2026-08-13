/**
 * emit_scan_summary_as_signal: the synthetic scan_outputs row that turns a
 * scan's summary into a signal. Identity is the scan id (external_ref and
 * dedup_key), so every scan yields exactly one new signal and a re-run of
 * the same scan upserts instead of twinning.
 */
import type { Database, Json } from "@/lib/database.types";

export const SCAN_SUMMARY_OUTPUT_KIND = "scan_summarized";

export interface SummarySignalOutputInput {
  organizationId: string;
  radarId: string;
  scanId: string;
  summaryMd: string;
  now: Date;
}

export function buildSummarySignalOutput(
  input: SummarySignalOutputInput,
): Database["public"]["Tables"]["scan_outputs"]["Insert"] {
  const externalRef = `scan_summary:${input.scanId}`;
  const minute = input.now.toISOString().slice(0, 16).replace("T", " ");
  return {
    organization_id: input.organizationId,
    radar_id: input.radarId,
    scan_id: input.scanId,
    radar_target_id: null,
    output_kind: SCAN_SUMMARY_OUTPUT_KIND,
    external_ref: externalRef,
    title: `Scan summary ${minute} UTC`,
    body: input.summaryMd,
    url: null,
    data: { dedup_key: externalRef } as unknown as Json,
    occurred_at: input.now.toISOString(),
  };
}
