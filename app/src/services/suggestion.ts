/**
 * Suggestions service. Reads and status changes (accept/dismiss) are
 * member-level operational actions per the role model; creation happens in
 * jobs via the service role.
 */
import type { Database } from "@/lib/database.types";
import { serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";
import { requireOrgContext } from "@/services/org";

export type SuggestionRow = Database["public"]["Tables"]["suggestions"]["Row"];

export async function listSuggestions(options?: {
  projectId?: string;
  statuses?: string[];
}): Promise<SuggestionRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  let query = supabase
    .from("suggestions")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (options?.projectId) query = query.eq("project_id", options.projectId);
  if (options?.statuses?.length) query = query.in("status", options.statuses);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getSuggestion(
  suggestionId: string,
): Promise<SuggestionRow | null> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Sibling suggestions from the same signal on other projects. */
export async function listSiblings(
  suggestion: SuggestionRow,
): Promise<SuggestionRow[]> {
  if (!suggestion.sibling_group_id) return [];
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("sibling_group_id", suggestion.sibling_group_id)
    .neq("id", suggestion.id);
  if (error) throw error;
  return data;
}

export type SuggestionDecision = "accepted" | "dismissed";

export async function setSuggestionStatus(
  suggestionId: string,
  decision: SuggestionDecision,
): Promise<void> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("suggestions")
    .update({ status: decision })
    .eq("id", suggestionId)
    .in("status", ["open", "elaborated"]);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: `suggestion_${decision}`,
    subjectType: "suggestion",
    subjectId: suggestionId,
    actorKind: "user",
    actorId: ctx.user.id,
  });
}

/** Total metered AI cost for one suggestion (USD estimate). */
export async function suggestionCostUsd(suggestionId: string): Promise<number> {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("ai_usage_events")
    .select("estimated_cost_usd")
    .eq("suggestion_id", suggestionId);
  if (error) throw error;
  return (data ?? []).reduce(
    (sum, row) => sum + Number(row.estimated_cost_usd ?? 0),
    0,
  );
}
