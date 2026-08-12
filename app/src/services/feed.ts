/**
 * Feed service: a feed collects signals from one or more radars for its
 * subscribers. Reads for members, configuration writes admin-only (RLS is
 * the backstop). feed_items are written by jobs (service role) only.
 */
import type { Database } from "@/lib/database.types";
import { pageRange, type ListParams } from "@/lib/list-params";
import { slugify } from "@/lib/schemas/radar-config";
import { serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";
import { requireAdminContext, requireOrgContext } from "@/services/org";

export type FeedRow = Database["public"]["Tables"]["feeds"]["Row"];
export type FeedItemRow = Database["public"]["Tables"]["feed_items"]["Row"];

export async function listFeeds(): Promise<FeedRow[]> {
  const ctx = await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("feeds")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getFeed(feedId: string): Promise<FeedRow | null> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("feeds")
    .select("*")
    .eq("id", feedId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createFeed(input: {
  name: string;
  descriptionMd?: string;
}): Promise<FeedRow> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  const base = slugify(input.name);
  const { data: existing } = await supabase
    .from("feeds")
    .select("slug")
    .eq("organization_id", ctx.organization.id)
    .eq("slug", base)
    .maybeSingle();
  const slug = existing
    ? `${base}-${Math.random().toString(36).slice(2, 6)}`
    : base;

  const { data: feed, error } = await supabase
    .from("feeds")
    .insert({
      organization_id: ctx.organization.id,
      name: input.name,
      slug,
      description_md: input.descriptionMd ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "feed_created",
    subjectType: "feed",
    subjectId: feed.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { name: input.name, slug },
  });

  return feed;
}

export async function updateFeed(
  feedId: string,
  patch: Partial<{
    name: string;
    description_md: string;
    must_include_keywords: string[] | null;
    muted_keywords: string[] | null;
  }>,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("feeds")
    .update(patch)
    .eq("id", feedId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "feed_updated",
    subjectType: "feed",
    subjectId: feedId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { fields: Object.keys(patch) },
  });
}

export async function deleteFeed(feedId: string): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("feeds")
    .delete()
    .eq("id", feedId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "feed_deleted",
    subjectType: "feed",
    subjectId: feedId,
    actorKind: "user",
    actorId: ctx.user.id,
  });
}

// --- Attached radars ----------------------------------------------------------

export interface FeedRadarWithRadar {
  feedId: string;
  radarId: string;
  radar: { id: string; name: string };
}

export async function listFeedRadars(
  feedId: string,
): Promise<FeedRadarWithRadar[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("feed_radars")
    .select("feed_id, radar_id, radars!inner(id, name)")
    .eq("feed_id", feedId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    feedId: row.feed_id,
    radarId: row.radar_id,
    radar: row.radars as unknown as { id: string; name: string },
  }));
}

export async function attachRadar(
  feedId: string,
  radarId: string,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase.from("feed_radars").upsert(
    {
      organization_id: ctx.organization.id,
      feed_id: feedId,
      radar_id: radarId,
    },
    { onConflict: "feed_id,radar_id" },
  );
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "feed_radar_attached",
    subjectType: "feed",
    subjectId: feedId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { radar_id: radarId },
  });
}

export async function detachRadar(
  feedId: string,
  radarId: string,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("feed_radars")
    .delete()
    .eq("feed_id", feedId)
    .eq("radar_id", radarId);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "feed_radar_detached",
    subjectType: "feed",
    subjectId: feedId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { radar_id: radarId },
  });
}

// --- Items (reads; embeds the slim signal projection) -------------------------

export interface FeedItemWithSignal {
  id: number;
  addedAt: string;
  signal: {
    id: string;
    radar_id: string;
    kind: string;
    title: string;
    summary_md: string;
    body_md: string;
    evidence: unknown;
    occurred_at: string;
  };
}

const ITEM_SELECT =
  "id, added_at, signals!inner(id, radar_id, kind, title, summary_md, body_md, evidence, occurred_at)";

export async function listFeedItemsPaged(
  feedId: string,
  params: ListParams,
): Promise<{ rows: FeedItemWithSignal[]; total: number }> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { from, to } = pageRange(params);
  let query = supabase
    .from("feed_items")
    .select(ITEM_SELECT, { count: "exact" })
    .eq("feed_id", feedId)
    .order("id", { ascending: false })
    .range(from, to);
  if (params.q) {
    query = query.ilike(
      "signals.title",
      `%${params.q.replace(/[%_]/g, "\\$&")}%`,
    );
  }
  if (params.kind) query = query.eq("signals.kind", params.kind);
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: (data ?? []).map((row) => ({
      id: row.id,
      addedAt: row.added_at,
      signal: row.signals as unknown as FeedItemWithSignal["signal"],
    })),
    total: count ?? 0,
  };
}

/** Distinct signal kinds present in one feed (filter options). */
export async function listFeedItemKinds(feedId: string): Promise<string[]> {
  await requireOrgContext();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("feed_items")
    .select("signals!inner(kind)")
    .eq("feed_id", feedId)
    .limit(1000);
  if (error) throw error;
  return [
    ...new Set(
      (data ?? []).map(
        (row) => (row.signals as unknown as { kind: string }).kind,
      ),
    ),
  ].sort();
}
