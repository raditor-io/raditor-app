/**
 * GET /api/v1/feeds/[feedId]/items — the pull feed for agents and companion
 * apps. Bearer rad_… token (pulled_feed subscription); `after` defaults to
 * the subscription's acked cursor so a bare GET returns everything unacked.
 * Ack by POSTing the cursor endpoint; at-least-once semantics.
 */
import { NextResponse, type NextRequest } from "next/server";

import { buildPullPage, parsePullQuery } from "@/feeds/pull-query";
import { buildSignalEnvelope } from "@/feeds/signal-envelope";
import { adminClient } from "@/lib/supabase/server";
import { PullApiError, requirePullContext } from "@/services/pull-context";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ feedId: string }> },
) {
  const { feedId } = await context.params;

  try {
    const { subscription } = await requirePullContext(request, feedId);
    const admin = adminClient();

    const { data: feed } = await admin
      .from("feeds")
      .select("id, name")
      .eq("id", feedId)
      .maybeSingle();
    if (!feed) {
      return NextResponse.json({ error: "Feed not found." }, { status: 404 });
    }

    const query = parsePullQuery(
      request.nextUrl.searchParams,
      Number(subscription.last_acked_feed_item_id),
    );

    const { data: rows, error } = await admin
      .from("feed_items")
      .select("id, added_at, signals!inner(*)")
      .eq("feed_id", feedId)
      .gt("id", query.afterFeedItemId)
      .order("id", { ascending: true })
      .limit(query.limit + 1);
    if (error) throw error;

    const page = buildPullPage(rows ?? [], query);

    return NextResponse.json({
      feed: { id: feed.id, name: feed.name },
      items: page.items.map((row) => ({
        feed_item_id: row.id,
        added_at: row.added_at,
        signal: buildSignalEnvelope(
          row.signals as unknown as Parameters<typeof buildSignalEnvelope>[0],
        ),
      })),
      next_cursor: page.nextCursor,
      has_more: page.hasMore,
    });
  } catch (err) {
    if (err instanceof PullApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[pull-api] items failed:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
