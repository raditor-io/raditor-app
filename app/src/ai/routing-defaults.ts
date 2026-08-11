/**
 * Default model routing per functionality, chosen from Venice's live catalog
 * by price/capability fit (2026-08-11). Route by stakes: cheap models for
 * summaries and evaluations, a strong writer for content; scan_briefing gets
 * a real-time-search model (grok supports web + X search).
 *
 * Resolution ladder (ai/router.ts): editor model_config override ->
 * organization model_routing -> these defaults. The Phase 8 eval harness
 * gates changes here (no routing change ships without a green eval run).
 */
import type { AiFunctionality } from "@/ai/types";

export const ROUTING_DEFAULTS: Record<AiFunctionality, string> = {
  scan_summary: "mistral-small-3-2-24b-instruct",
  scan_briefing: "grok-4-20",
  signal_evaluation: "deepseek-v4-flash",
  content_suggestion: "qwen3-235b-a22b-instruct-2507",
  content_draft: "qwen3-235b-a22b-instruct-2507",
  translation: "deepseek-v4-flash",
  draft_critique: "qwen3-235b-a22b-instruct-2507",
  eval_judgement: "qwen3-235b-a22b-instruct-2507",
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
  "deepseek-v4-flash": { input: 0.138, output: 0.275 },
  "qwen3-235b-a22b-instruct-2507": { input: 0.15, output: 0.75 },
  "grok-4-20": { input: 1.42, output: 2.83 },
  "llama-3.3-70b": { input: 0.7, output: 2.8 },
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
