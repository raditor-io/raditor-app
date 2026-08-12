/**
 * Feed fan-out: freshly reconciled signals of one radar land in every feed
 * listening to that radar (feed_radars) as feed_items, after the feed's
 * optional keyword filters over the signal's title + summary; each NEW item
 * then enqueues one deliver_feed_item job per active pushed_webhook
 * subscription of that feed. Runs inline at the end of run_scan — the
 * inserts are cheap and idempotent, only the webhook POST needs its own
 * queue. Feeds collect from attach-time forward (no backfill).
 */
import { passesKeywordFilters } from "@/feeds/keyword-filter";
import { adminClient } from "@/lib/supabase/server";
import { enqueueJob } from "@/jobs/queue";

export interface FanOutSignal {
  id: string;
  title: string;
  summary_md: string;
}

export async function fanOutSignalsToFeeds(input: {
  organizationId: string;
  radarId: string;
  signals: FanOutSignal[];
}): Promise<{ feedItemsCreated: number; deliveriesEnqueued: number }> {
  const { organizationId, radarId, signals } = input;
  if (signals.length === 0) {
    return { feedItemsCreated: 0, deliveriesEnqueued: 0 };
  }
  const admin = adminClient();

  const { data: feedRadars, error: feedRadarsError } = await admin
    .from("feed_radars")
    .select("feed_id, feeds!inner(must_include_keywords, muted_keywords)")
    .eq("radar_id", radarId);
  if (feedRadarsError) throw feedRadarsError;
  if (!feedRadars || feedRadars.length === 0) {
    return { feedItemsCreated: 0, deliveriesEnqueued: 0 };
  }

  let feedItemsCreated = 0;
  let deliveriesEnqueued = 0;

  for (const feedRadar of feedRadars) {
    const feed = feedRadar.feeds as unknown as {
      must_include_keywords: string[] | null;
      muted_keywords: string[] | null;
    };
    const eligible = signals.filter((signal) =>
      passesKeywordFilters(`${signal.title}\n${signal.summary_md}`, {
        mustIncludeKeywords: feed.must_include_keywords,
        mutedKeywords: feed.muted_keywords,
      }),
    );
    if (eligible.length === 0) continue;

    // ignoreDuplicates + select returns only the rows actually inserted, so
    // re-runs never re-deliver an item.
    const { data: insertedItems, error: itemsError } = await admin
      .from("feed_items")
      .upsert(
        eligible.map((signal) => ({
          organization_id: organizationId,
          feed_id: feedRadar.feed_id,
          signal_id: signal.id,
        })),
        { onConflict: "feed_id,signal_id", ignoreDuplicates: true },
      )
      .select("id");
    if (itemsError) throw itemsError;
    if (!insertedItems || insertedItems.length === 0) continue;
    feedItemsCreated += insertedItems.length;

    const { data: webhookSubscriptions, error: subsError } = await admin
      .from("subscriptions")
      .select("id")
      .eq("feed_id", feedRadar.feed_id)
      .eq("transport", "pushed_webhook")
      .eq("is_active", true);
    if (subsError) throw subsError;

    for (const item of insertedItems) {
      for (const subscription of webhookSubscriptions ?? []) {
        await enqueueJob("deliver", "deliver_feed_item", {
          subscriptionId: subscription.id,
          feedItemId: item.id,
        });
        deliveriesEnqueued += 1;
      }
    }
  }

  return { feedItemsCreated, deliveriesEnqueued };
}
