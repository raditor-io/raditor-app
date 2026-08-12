/**
 * Functionality router: resolves the model through the ladder
 * (explicit override -> organization model_routing -> platform defaults),
 * resolves the provider key (org BYOK comes later), runs the chat, and
 * meters usage into ai_usage_events. All AI calls go through aiChat().
 */
import { estimateCostUsd, ROUTING_DEFAULTS } from "@/ai/routing-defaults";
import { VeniceProvider } from "@/ai/providers/venice";
import type {
  AiFunctionality,
  AiProvider,
  ChatMessage,
  ChatResult,
} from "@/ai/types";
import { requireEnv } from "@/lib/env";
import { adminClient } from "@/lib/supabase/server";

export interface AiChatInput {
  organizationId: string;
  functionality: AiFunctionality;
  messages: ChatMessage[];
  scanId?: string;
  /** Explicit model override, when the caller has one configured. */
  modelOverride?: string;
  temperature?: number;
  maxTokens?: number;
  isJsonResponse?: boolean;
  isWebSearchEnabled?: boolean;
}

/** Test seam: inject a fake provider; production resolves Venice lazily. */
let providerOverride: AiProvider | null = null;

export function setProviderForTesting(provider: AiProvider | null): void {
  providerOverride = provider;
}

function resolveProvider(): { provider: AiProvider; isByok: boolean } {
  if (providerOverride) return { provider: providerOverride, isByok: false };
  // Phase 9 adds org BYOK resolution from provider_credentials here.
  const env = requireEnv("VENICE_API_KEY");
  return {
    provider: new VeniceProvider({ apiKey: env.VENICE_API_KEY }),
    isByok: false,
  };
}

/** Organization-level routing override for one functionality, if configured. */
async function orgModelFor(
  organizationId: string,
  functionality: AiFunctionality,
): Promise<string | undefined> {
  try {
    const { data } = await adminClient()
      .from("organizations")
      .select("model_routing")
      .eq("id", organizationId)
      .maybeSingle();
    const routing = (data?.model_routing ?? {}) as Record<string, unknown>;
    const model = routing[functionality];
    return typeof model === "string" && model.length > 0 ? model : undefined;
  } catch (err) {
    console.error("[ai] failed reading org model_routing:", err);
    return undefined;
  }
}

export async function aiChat(input: AiChatInput): Promise<ChatResult> {
  const model =
    input.modelOverride ??
    (await orgModelFor(input.organizationId, input.functionality)) ??
    ROUTING_DEFAULTS[input.functionality];
  const { provider, isByok } = resolveProvider();

  const result = await provider.chat({
    model,
    messages: input.messages,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    isJsonResponse: input.isJsonResponse,
    isWebSearchEnabled: input.isWebSearchEnabled,
  });

  try {
    await adminClient().from("ai_usage_events").insert({
      organization_id: input.organizationId,
      scan_id: input.scanId ?? null,
      functionality: input.functionality,
      provider: provider.id,
      model: result.model,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      estimated_cost_usd: estimateCostUsd(
        result.model,
        result.usage.inputTokens,
        result.usage.outputTokens,
      ),
      is_byok: isByok,
    });
  } catch (err) {
    console.error("[ai] failed to record usage event:", err);
  }

  return result;
}

/** Extract a JSON object from a model response (handles fenced output). */
export function parseJsonResponse<T>(content: string): T {
  const trimmed = content.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(unfenced.slice(start, end + 1)) as T;
    }
    throw new Error("Model response contained no parseable JSON object");
  }
}
