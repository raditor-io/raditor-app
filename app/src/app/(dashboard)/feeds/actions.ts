"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/shared/action-form";
import { parseKeywordList } from "@/feeds/keyword-filter";
import { errorMessage } from "@/lib/error-message";
import {
  attachRadar,
  createFeed,
  deleteFeed,
  detachRadar,
  updateFeed,
} from "@/services/feed";
import {
  createInAppSubscription,
  createPullSubscription,
  createWebhookSubscription,
  deleteSubscription,
  removeInAppSubscription,
  setSubscriptionActive,
  updatePullSubscription,
  updateWebhookSubscription,
} from "@/services/subscription";

const createFeedSchema = z.object({
  name: z.string().min(1).max(120),
  description_md: z.string().max(10_000),
});

export async function createFeedAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createFeedSchema.safeParse({
    name: formData.get("name"),
    description_md: formData.get("description_md") ?? "",
  });
  if (!parsed.success) return { error: "Give the feed a name." };

  let feedId: string;
  try {
    const feed = await createFeed({
      name: parsed.data.name,
      descriptionMd: parsed.data.description_md,
    });
    feedId = feed.id;
  } catch (err) {
    return { error: errorMessage(err, "Could not create the feed.") };
  }
  redirect(`/feeds/${feedId}`);
}

const updateFeedSchema = z.object({
  feed_id: z.uuid(),
  name: z.string().min(1).max(120),
  description_md: z.string().max(10_000),
  must_include_keywords: z.string().max(1_000),
  muted_keywords: z.string().max(1_000),
});

export async function updateFeedAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateFeedSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the feed fields." };
  const mustInclude = parseKeywordList(parsed.data.must_include_keywords);
  const muted = parseKeywordList(parsed.data.muted_keywords);
  try {
    await updateFeed(parsed.data.feed_id, {
      name: parsed.data.name,
      description_md: parsed.data.description_md,
      must_include_keywords: mustInclude.length > 0 ? mustInclude : null,
      muted_keywords: muted.length > 0 ? muted : null,
    });
    revalidatePath(`/feeds/${parsed.data.feed_id}`);
    return { notice: "Feed saved." };
  } catch (err) {
    return { error: errorMessage(err, "Could not save the feed.") };
  }
}

const feedIdSchema = z.object({ feed_id: z.uuid() });

export async function deleteFeedAction(formData: FormData): Promise<void> {
  const parsed = feedIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await deleteFeed(parsed.data.feed_id);
  redirect("/");
}

const attachRadarSchema = z.object({
  feed_id: z.uuid(),
  radar_id: z.uuid(),
});

export async function attachRadarAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = attachRadarSchema.safeParse({
    feed_id: formData.get("feed_id"),
    radar_id: formData.get("radar_id"),
  });
  if (!parsed.success) return { error: "Pick a radar to attach." };
  try {
    await attachRadar(parsed.data.feed_id, parsed.data.radar_id);
    revalidatePath(`/feeds/${parsed.data.feed_id}/settings`);
    return { notice: "Radar attached." };
  } catch (err) {
    return { error: errorMessage(err, "Could not attach the radar.") };
  }
}

const detachRadarSchema = z.object({
  feed_id: z.uuid(),
  radar_id: z.uuid(),
});

export async function detachRadarAction(formData: FormData): Promise<void> {
  const parsed = detachRadarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await detachRadar(parsed.data.feed_id, parsed.data.radar_id);
  revalidatePath(`/feeds/${parsed.data.feed_id}/settings`);
}

/** ActionResult carrying show-once material back to the create form. */
export interface SubscriptionCreateResult extends ActionResult {
  secretShownOnce?: string;
  createdName?: string;
}

const webhookFieldSchemas = {
  name: z.string().min(1).max(120),
  webhook_url: z.string().min(1).max(2_000),
  webhook_method: z.enum([
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ]),
  auth_username: z.string().max(200),
  auth_password: z.string().max(200),
  auth_token: z.string().max(2_000),
  auth_header_name: z.string().max(64),
  auth_header_value: z.string().max(2_000),
  body_template: z.string().max(20_000),
};

const createWebhookSubscriptionSchema = z.object({
  feed_id: z.uuid(),
  auth_type: z.enum(["none", "basic", "bearer", "custom"]),
  ...webhookFieldSchemas,
});

/** The edit form's extra auth mode: leave the stored header untouched. */
const updateWebhookSubscriptionSchema = z.object({
  feed_id: z.uuid(),
  subscription_id: z.uuid(),
  auth_type: z.enum(["keep", "none", "basic", "bearer", "custom"]),
  ...webhookFieldSchemas,
});

interface WebhookAuthFormFields {
  auth_type: "none" | "basic" | "bearer" | "custom";
  auth_username: string;
  auth_password: string;
  auth_token: string;
  auth_header_name: string;
  auth_header_value: string;
}

/** httpie-style auth composition: the form holds raw parts, the header is built here. */
function composeAuthHeader(
  data: WebhookAuthFormFields,
): { headerName: string; value: string } | { error: string } | undefined {
  switch (data.auth_type) {
    case "none":
      return undefined;
    case "basic": {
      const username = data.auth_username.trim();
      if (!username) return { error: "Enter a username for basic auth." };
      const encoded = Buffer.from(
        `${username}:${data.auth_password}`,
        "utf8",
      ).toString("base64");
      return { headerName: "Authorization", value: `Basic ${encoded}` };
    }
    case "bearer": {
      const token = data.auth_token.trim();
      if (!token) return { error: "Enter the bearer token." };
      return { headerName: "Authorization", value: `Bearer ${token}` };
    }
    case "custom": {
      const headerName = data.auth_header_name.trim();
      const value = data.auth_header_value.trim();
      if (!headerName || !value) {
        return { error: "Enter the header name and value." };
      }
      return { headerName, value };
    }
  }
}

export async function createWebhookSubscriptionAction(
  _prev: SubscriptionCreateResult,
  formData: FormData,
): Promise<SubscriptionCreateResult> {
  const parsed = createWebhookSubscriptionSchema.safeParse({
    feed_id: formData.get("feed_id"),
    name: formData.get("name"),
    webhook_url: formData.get("webhook_url"),
    webhook_method: formData.get("webhook_method") ?? "POST",
    auth_type: formData.get("auth_type") ?? "none",
    auth_username: formData.get("auth_username") ?? "",
    auth_password: formData.get("auth_password") ?? "",
    auth_token: formData.get("auth_token") ?? "",
    auth_header_name: formData.get("auth_header_name") ?? "",
    auth_header_value: formData.get("auth_header_value") ?? "",
    body_template: formData.get("body_template") ?? "",
  });
  if (!parsed.success) {
    return { error: "Give the subscription a name and an https URL." };
  }
  const apiKey = composeAuthHeader(parsed.data);
  if (apiKey && "error" in apiKey) return { error: apiKey.error };
  try {
    const { secretShownOnce } = await createWebhookSubscription({
      feedId: parsed.data.feed_id,
      name: parsed.data.name,
      webhookUrl: parsed.data.webhook_url,
      method: parsed.data.webhook_method,
      apiKey,
      bodyTemplate: parsed.data.body_template.trim() || undefined,
    });
    revalidatePath(`/feeds/${parsed.data.feed_id}/settings`);
    return {
      notice: "Webhook subscription created. Copy the signing secret now:",
      secretShownOnce,
      createdName: parsed.data.name,
    };
  } catch (err) {
    return { error: errorMessage(err, "Could not create the subscription.") };
  }
}

export async function updateWebhookSubscriptionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateWebhookSubscriptionSchema.safeParse({
    feed_id: formData.get("feed_id"),
    subscription_id: formData.get("subscription_id"),
    name: formData.get("name"),
    webhook_url: formData.get("webhook_url"),
    webhook_method: formData.get("webhook_method") ?? "POST",
    auth_type: formData.get("auth_type") ?? "keep",
    auth_username: formData.get("auth_username") ?? "",
    auth_password: formData.get("auth_password") ?? "",
    auth_token: formData.get("auth_token") ?? "",
    auth_header_name: formData.get("auth_header_name") ?? "",
    auth_header_value: formData.get("auth_header_value") ?? "",
    body_template: formData.get("body_template") ?? "",
  });
  if (!parsed.success) {
    return { error: "Give the subscription a name and an https URL." };
  }
  let apiKey: { headerName: string; value: string } | null | undefined;
  if (parsed.data.auth_type === "keep") {
    apiKey = undefined;
  } else {
    const composed = composeAuthHeader({
      ...parsed.data,
      auth_type: parsed.data.auth_type,
    });
    if (composed && "error" in composed) return { error: composed.error };
    apiKey = composed ?? null;
  }
  try {
    await updateWebhookSubscription({
      subscriptionId: parsed.data.subscription_id,
      name: parsed.data.name,
      webhookUrl: parsed.data.webhook_url,
      method: parsed.data.webhook_method,
      apiKey,
      bodyTemplate: parsed.data.body_template.trim() || null,
    });
    revalidatePath(`/feeds/${parsed.data.feed_id}/settings`);
    return { notice: "Subscription saved." };
  } catch (err) {
    return { error: errorMessage(err, "Could not save the subscription.") };
  }
}

const createPullSubscriptionSchema = z.object({
  feed_id: z.uuid(),
  name: z.string().min(1).max(120),
  subscriber_kind: z.enum(["agent", "web_service"]),
});

export async function createPullSubscriptionAction(
  _prev: SubscriptionCreateResult,
  formData: FormData,
): Promise<SubscriptionCreateResult> {
  const parsed = createPullSubscriptionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return { error: "Give the subscription a name." };
  try {
    const { tokenShownOnce } = await createPullSubscription({
      feedId: parsed.data.feed_id,
      name: parsed.data.name,
      subscriberKind: parsed.data.subscriber_kind,
    });
    revalidatePath(`/feeds/${parsed.data.feed_id}/settings`);
    return {
      notice: "Pull subscription created. Copy the API token now:",
      secretShownOnce: tokenShownOnce,
      createdName: parsed.data.name,
    };
  } catch (err) {
    return { error: errorMessage(err, "Could not create the subscription.") };
  }
}

const updatePullSubscriptionSchema = z.object({
  feed_id: z.uuid(),
  subscription_id: z.uuid(),
  name: z.string().min(1).max(120),
  subscriber_kind: z.enum(["agent", "web_service"]),
});

export async function updatePullSubscriptionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updatePullSubscriptionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return { error: "Give the subscription a name." };
  try {
    await updatePullSubscription({
      subscriptionId: parsed.data.subscription_id,
      name: parsed.data.name,
      subscriberKind: parsed.data.subscriber_kind,
    });
    revalidatePath(`/feeds/${parsed.data.feed_id}/settings`);
    return { notice: "Subscription saved." };
  } catch (err) {
    return { error: errorMessage(err, "Could not save the subscription.") };
  }
}

export async function subscribeInAppAction(formData: FormData): Promise<void> {
  const parsed = feedIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await createInAppSubscription(parsed.data.feed_id);
  revalidatePath(`/feeds/${parsed.data.feed_id}`);
}

export async function unsubscribeInAppAction(
  formData: FormData,
): Promise<void> {
  const parsed = feedIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await removeInAppSubscription(parsed.data.feed_id);
  revalidatePath(`/feeds/${parsed.data.feed_id}`);
}

const subscriptionToggleSchema = z.object({
  feed_id: z.uuid(),
  subscription_id: z.uuid(),
  is_active: z.enum(["true", "false"]),
});

export async function setSubscriptionActiveAction(
  formData: FormData,
): Promise<void> {
  const parsed = subscriptionToggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setSubscriptionActive(
    parsed.data.subscription_id,
    parsed.data.is_active === "true",
  );
  revalidatePath(`/feeds/${parsed.data.feed_id}/settings`);
}

const subscriptionDeleteSchema = z.object({
  feed_id: z.uuid(),
  subscription_id: z.uuid(),
});

export async function deleteSubscriptionAction(
  formData: FormData,
): Promise<void> {
  const parsed = subscriptionDeleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await deleteSubscription(parsed.data.subscription_id);
  revalidatePath(`/feeds/${parsed.data.feed_id}/settings`);
}
