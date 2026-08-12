import { IconRadar2 } from "@tabler/icons-react";
import { notFound } from "next/navigation";

import { AddSubscriberModal } from "@/components/feeds/add-subscriber-modal";
import { ActionForm } from "@/components/shared/action-form";
import { FormField } from "@/components/shared/form-field";
import { INPUT_CLASSES } from "@/components/shared/form-styles";
import { requireOrgContext } from "@/services/org";
import { getFeed, listFeedRadars } from "@/services/feed";
import { listRadars } from "@/services/radar";
import {
  listDeliveries,
  listSubscriptions,
  type DeliveryListRow,
} from "@/services/subscription";

import {
  attachRadarAction,
  deleteSubscriptionAction,
  detachRadarAction,
  setSubscriptionActiveAction,
  updateFeedAction,
} from "../../actions";

export const metadata = { title: "Configure feed | Raditor" };

export default async function FeedSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const feed = await getFeed(id);
  if (!feed) notFound();

  const [attachedRadars, radars, subscriptions] = await Promise.all([
    listFeedRadars(id),
    listRadars(),
    listSubscriptions(id),
  ]);
  const attachedRadarIds = new Set(attachedRadars.map((fr) => fr.radarId));
  const attachableRadars = radars.filter((r) => !attachedRadarIds.has(r.id));

  const webhookDeliveries = new Map<string, DeliveryListRow[]>(
    await Promise.all(
      subscriptions
        .filter((sub) => sub.transport === "pushed_webhook")
        .map(
          async (sub) => [sub.id, await listDeliveries(sub.id)] as const,
        ),
    ),
  );

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Feed settings
        </h2>
        {ctx.isAdmin ? (
          <ActionForm action={updateFeedAction} requireDirty>
            <input type="hidden" name="feed_id" value={feed.id} />
            <FormField label="Name">
              <input
                name="name"
                defaultValue={feed.name}
                required
                maxLength={120}
                className={INPUT_CLASSES}
              />
            </FormField>
            <FormField label="Description" isMultiline>
              <textarea
                name="description_md"
                defaultValue={feed.description_md}
                rows={2}
                className={INPUT_CLASSES}
              />
            </FormField>
            <FormField
              label="Must include"
              description="Comma-separated keywords; incoming signals must contain at least one. Empty = all signals."
            >
              <input
                name="must_include_keywords"
                defaultValue={feed.must_include_keywords?.join(", ") ?? ""}
                maxLength={1000}
                className={INPUT_CLASSES}
                placeholder="pricing, launch"
              />
            </FormField>
            <FormField
              label="Muted words"
              description="Comma-separated; signals containing any of these are skipped."
            >
              <input
                name="muted_keywords"
                defaultValue={feed.muted_keywords?.join(", ") ?? ""}
                maxLength={1000}
                className={INPUT_CLASSES}
                placeholder="rumor, giveaway"
              />
            </FormField>
          </ActionForm>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-foreground">{feed.name}</p>
            <p className="text-muted">{feed.description_md}</p>
            {feed.must_include_keywords?.length ? (
              <p className="text-xs text-faint">
                Must include: {feed.must_include_keywords.join(", ")}
              </p>
            ) : null}
            {feed.muted_keywords?.length ? (
              <p className="text-xs text-faint">
                Muted words: {feed.muted_keywords.join(", ")}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-1 text-base font-semibold text-foreground">
          Radars
        </h2>
        <p className="mb-4 text-sm text-muted">
          Signals from attached radars flow into this feed (from attach time
          forward).
        </p>
        {attachedRadars.length === 0 ? (
          <p className="text-sm text-faint">No radars attached yet.</p>
        ) : (
          <ul className="space-y-2">
            {attachedRadars.map((attached) => (
              <li
                key={attached.radarId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <IconRadar2
                    size={16}
                    stroke={1.75}
                    className="shrink-0 text-muted"
                  />
                  <span className="truncate">{attached.radar.name}</span>
                </span>
                {ctx.isAdmin ? (
                  <form action={detachRadarAction}>
                    <input type="hidden" name="feed_id" value={feed.id} />
                    <input
                      type="hidden"
                      name="radar_id"
                      value={attached.radarId}
                    />
                    <button
                      type="submit"
                      className="cursor-pointer text-xs text-accent-deep hover:underline"
                    >
                      Detach
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {ctx.isAdmin && attachableRadars.length > 0 ? (
          <div className="mt-4 border-t border-border pt-4">
            <ActionForm action={attachRadarAction} submitLabel="Attach radar">
              <input type="hidden" name="feed_id" value={feed.id} />
              <FormField label="Radar">
                <select name="radar_id" className={INPUT_CLASSES} required>
                  {attachableRadars.map((radar) => (
                    <option key={radar.id} value={radar.id}>
                      {radar.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </ActionForm>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Subscribers
          </h2>
          {ctx.isAdmin ? <AddSubscriberModal feedId={feed.id} /> : null}
        </div>
        <p className="mb-4 text-sm text-muted">
          Web services get signed webhook pushes; agents poll the feed with an
          API token and cursor; members subscribe in-app.
        </p>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-faint">No subscribers yet.</p>
        ) : (
          <ul className="space-y-2">
            {subscriptions.map((subscription) => {
              const deliveries = webhookDeliveries.get(subscription.id) ?? [];
              return (
                <li
                  key={subscription.id}
                  className="rounded-lg border border-border bg-surface px-4 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-sm">
                      <span className="text-foreground">{subscription.name}</span>
                      <span className="ml-2 text-xs text-faint">
                        {subscription.subscriberKind} ·{" "}
                        {subscription.transport.replaceAll("_", " ")}
                        {subscription.webhookUrl
                          ? ` · ${subscription.webhookMethod} ${subscription.webhookUrl}`
                          : ""}
                        {subscription.apiTokenPrefix
                          ? ` · ${subscription.apiTokenPrefix}… · cursor ${subscription.lastAckedFeedItemId}`
                          : ""}
                      </span>
                    </span>
                    {ctx.isAdmin ? (
                      <span className="flex shrink-0 items-center gap-2">
                        <form action={setSubscriptionActiveAction}>
                          <input type="hidden" name="feed_id" value={feed.id} />
                          <input
                            type="hidden"
                            name="subscription_id"
                            value={subscription.id}
                          />
                          <input
                            type="hidden"
                            name="is_active"
                            value={subscription.isActive ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="cursor-pointer text-xs text-muted hover:underline"
                          >
                            {subscription.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        <form action={deleteSubscriptionAction}>
                          <input type="hidden" name="feed_id" value={feed.id} />
                          <input
                            type="hidden"
                            name="subscription_id"
                            value={subscription.id}
                          />
                          <button
                            type="submit"
                            className="cursor-pointer text-xs text-accent-deep hover:underline"
                          >
                            Delete
                          </button>
                        </form>
                      </span>
                    ) : null}
                  </div>
                  {!subscription.isActive ? (
                    <p className="mt-1 text-xs text-faint">inactive</p>
                  ) : null}
                  {deliveries.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-t border-border pt-2">
                      {deliveries.map((delivery) => (
                        <li
                          key={delivery.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-faint">
                            item #{delivery.feedItemId} · attempt{" "}
                            {delivery.attemptCount}
                            {delivery.errorMessage
                              ? ` · ${delivery.errorMessage}`
                              : ""}
                          </span>
                          <span
                            className={
                              delivery.status === "delivered"
                                ? "text-success"
                                : delivery.status === "failed"
                                  ? "text-accent-deep"
                                  : "text-muted"
                            }
                          >
                            {delivery.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          Pull API
        </h2>
        <p className="text-sm text-muted">
          Pull subscribers fetch items and acknowledge a cursor:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-hover p-3 font-mono text-xs text-muted">
          {`GET  /api/v1/feeds/${feed.id}/items
POST /api/v1/feeds/${feed.id}/cursor  {"last_acked_feed_item_id": <id>}
Authorization: Bearer rad_...`}
        </pre>
      </section>
    </div>
  );
}
