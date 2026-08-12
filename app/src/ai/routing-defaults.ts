/**
 * Default model routing per functionality, chosen from Venice's live catalog
 * by price/capability fit (2026-08-12). Route by stakes: a cheap model for
 * event summaries; scan_briefing gets a real-time-search model (grok
 * supports web + X search).
 *
 * Resolution ladder (ai/router.ts): explicit override ->
 * organization model_routing -> these defaults.
 */
import type { AiFunctionality } from "@/ai/types";

export const ROUTING_DEFAULTS: Record<AiFunctionality, string> = {
  scan_summary: "mistral-small-3-2-24b-instruct",
  scan_briefing: "grok-4-20",
};

/**
 * USD prices per 1M tokens (input, output), from Venice's model catalog
 * (model_spec.pricing). Used for the estimated_cost_usd metering; refresh
 * when routing changes.
 */
export const MODEL_COSTS_PER_MTOK: Record<
  string,
  { input: number; output: number }
> = {
  "mistral-small-3-2-24b-instruct": { input: 0.09375, output: 0.25 },
  "grok-4-20": { input: 1.42, output: 2.83 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = MODEL_COSTS_PER_MTOK[model];
  if (!price) return 0;
  return (
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output
  );
}
