/**
 * POST /api/v1/feeds/[feedId]/cursor — advance (or rewind, for replay) the
 * pulled_feed subscription's acked cursor. Body:
 * { "last_acked_feed_item_id": number }.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { adminClient } from "@/lib/supabase/server";
import { PullApiError, requirePullContext } from "@/services/pull-context";

const cursorSchema = z.object({
  last_acked_feed_item_id: z.number().int().min(0),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ feedId: string }> },
) {
  const { feedId } = await context.params;

  try {
    const { subscription } = await requirePullContext(request, feedId);

    const parsed = cursorSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Body must be { last_acked_feed_item_id: number }." },
        { status: 400 },
      );
    }

    const { error } = await adminClient()
      .from("subscriptions")
      .update({
        last_acked_feed_item_id: parsed.data.last_acked_feed_item_id,
      })
      .eq("id", subscription.id);
    if (error) throw error;

    return NextResponse.json({
      last_acked_feed_item_id: parsed.data.last_acked_feed_item_id,
    });
  } catch (err) {
    if (err instanceof PullApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[pull-api] cursor failed:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
