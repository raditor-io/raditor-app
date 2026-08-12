"use client";

/**
 * Subscription creation forms with show-once secret/token panes: the value
 * appears exactly once in the action result and is never retrievable again
 * (only the sealed secret / token hash is stored). Embedders (the add
 * subscriber modal) pass onCreated to take over rendering of the result.
 */
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  createPullSubscriptionAction,
  createWebhookSubscriptionAction,
  type SubscriptionCreateResult,
} from "@/app/(dashboard)/feeds/actions";
import { BODY_TEMPLATE_PLACEHOLDERS } from "@/feeds/body-template";
import { FormField } from "@/components/shared/form-field";
import { INPUT_CLASSES } from "@/components/shared/form-styles";

export interface CreatedSubscription {
  name: string;
  notice: string;
  secretShownOnce: string;
}

export function ShowOnceSecret({ value }: { value: string }) {
  const [isCopied, setIsCopied] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context): the value
      // stays selectable by hand.
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-accent-deep">
        This code is shown only once, store it safely.
      </p>
      <div className="flex items-start gap-2 rounded-md border border-border bg-hover p-3">
        <code className="min-w-0 flex-1 select-all break-all font-mono text-xs text-foreground">
          {value}
        </code>
        <button
          type="button"
          onClick={copyToClipboard}
          aria-label={isCopied ? "Copied" : "Copy to clipboard"}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          {isCopied ? (
            <IconCheck size={15} stroke={2} className="text-success" />
          ) : (
            <IconCopy size={15} stroke={1.75} />
          )}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ label, isPending }: { label: string; isPending: boolean }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="cursor-pointer rounded-md border border-transparent bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep disabled:cursor-not-allowed disabled:border-border disabled:bg-hover disabled:text-faint"
    >
      {isPending ? "Creating..." : label}
    </button>
  );
}

/** Invoke onCreated exactly once per successful action result. */
function useCreatedCallback(
  state: SubscriptionCreateResult,
  onCreated?: (created: CreatedSubscription) => void,
) {
  const lastHandled = useRef<SubscriptionCreateResult>(state);
  useEffect(() => {
    if (state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.secretShownOnce && state.createdName) {
      onCreated?.({
        name: state.createdName,
        notice: state.notice ?? "",
        secretShownOnce: state.secretShownOnce,
      });
    }
  }, [state, onCreated]);
}

type WebhookAuthType = "none" | "basic" | "bearer" | "custom";
type WebhookFormTab = "auth" | "body";

function FormTabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`cursor-pointer border-b-2 px-3 py-1.5 text-sm ${
        isActive
          ? "border-accent font-medium text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function CreateWebhookSubscriptionForm({
  feedId,
  onCreated,
}: {
  feedId: string;
  onCreated?: (created: CreatedSubscription) => void;
}) {
  const [state, formAction, isPending] = useActionState<
    SubscriptionCreateResult,
    FormData
  >(createWebhookSubscriptionAction, {});
  useCreatedCallback(state, onCreated);
  const [authType, setAuthType] = useState<WebhookAuthType>("none");
  const [activeTab, setActiveTab] = useState<WebhookFormTab>("auth");
  const bodyTemplateRef = useRef<HTMLTextAreaElement>(null);

  function insertPlaceholder(path: string) {
    const textarea = bodyTemplateRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    textarea.setRangeText(`{{${path}}}`, start, end, "end");
    textarea.focus();
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="feed_id" value={feedId} />
      <FormField label="Name">
        <input
          name="name"
          required
          maxLength={120}
          className={INPUT_CLASSES}
          placeholder="Pricing API"
        />
      </FormField>
      <FormField label="Webhook URL" description="https only">
        <span className="flex gap-2">
          {/* Not INPUT_CLASSES: its w-full loses the conflict-order lottery
              against w-auto, so the select gets explicit sizing. */}
          <select
            name="webhook_method"
            defaultValue="POST"
            aria-label="Delivery method"
            className="w-[104px] shrink-0 cursor-pointer rounded-md border border-border bg-surface px-2 py-2 font-mono text-sm text-foreground transition-shadow focus:border-border-strong focus:outline-none focus:ring-4 focus:ring-foreground/5"
          >
            {["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].map(
              (method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ),
            )}
          </select>
          <input
            name="webhook_url"
            required
            type="url"
            className={`${INPUT_CLASSES} min-w-0 flex-1`}
            placeholder="https://api.example.com/hooks/raditor"
          />
        </span>
      </FormField>
      <div role="tablist" className="flex gap-1 border-b border-border">
        <FormTabButton
          label="Auth"
          isActive={activeTab === "auth"}
          onClick={() => setActiveTab("auth")}
        />
        <FormTabButton
          label="Body"
          isActive={activeTab === "body"}
          onClick={() => setActiveTab("body")}
        />
      </div>

      {/* Both panels stay mounted (hidden) so values survive tab switches;
          auth fields validate server-side, so no required attrs that a
          hidden panel could trap submission on. */}
      <div className={activeTab === "auth" ? "space-y-3" : "hidden"}>
        <FormField
          label="Authentication"
          description="For destinations that require auth (e.g. Resend), sent with every delivery."
        >
          <select
            name="auth_type"
            value={authType}
            onChange={(e) => setAuthType(e.target.value as WebhookAuthType)}
            className={INPUT_CLASSES}
          >
            <option value="none">None</option>
            <option value="basic">Basic auth</option>
            <option value="bearer">Bearer token</option>
            <option value="custom">Custom</option>
          </select>
        </FormField>
        {authType === "basic" ? (
          <>
            <FormField label="Username">
              <input
                name="auth_username"
                maxLength={200}
                className={INPUT_CLASSES}
                autoComplete="off"
              />
            </FormField>
            <FormField label="Password">
              <input
                name="auth_password"
                type="password"
                maxLength={200}
                className={INPUT_CLASSES}
                autoComplete="new-password"
              />
            </FormField>
          </>
        ) : null}
        {authType === "bearer" ? (
          <FormField
            label="Token"
            description="The API key only; Bearer is added for you."
          >
            <input
              name="auth_token"
              maxLength={2000}
              className={INPUT_CLASSES}
              placeholder="re_..."
              autoComplete="off"
            />
          </FormField>
        ) : null}
        {authType === "custom" ? (
          <>
            <FormField label="Header name">
              <input
                name="auth_header_name"
                maxLength={64}
                pattern="[A-Za-z0-9-]+"
                className={INPUT_CLASSES}
                placeholder="X-Api-Key"
              />
            </FormField>
            <FormField label="Value">
              <input
                name="auth_header_value"
                maxLength={2000}
                className={INPUT_CLASSES}
                autoComplete="off"
              />
            </FormField>
          </>
        ) : null}
      </div>

      <div className={activeTab === "body" ? "space-y-3" : "hidden"}>
        <FormField
          label="Insert placeholder"
          description="Inserts at the cursor. {{path}} renders JSON-escaped text; {{{path}}} injects the raw JSON value."
        >
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) insertPlaceholder(e.target.value);
              e.target.value = "";
            }}
            className={INPUT_CLASSES}
          >
            <option value="">Select a placeholder...</option>
            {BODY_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
              <option key={placeholder.path} value={placeholder.path}>
                {placeholder.path} — {placeholder.description}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Body template"
          description="Empty = the standard Raditor envelope. With a template, the delivery body is exactly what you write here."
        >
          <textarea
            ref={bodyTemplateRef}
            name="body_template"
            rows={6}
            maxLength={20000}
            className={`${INPUT_CLASSES} font-mono text-xs`}
            placeholder={`{"from":"Raditor <signals@yourdomain.com>","to":["you@acme.com"],"subject":"{{signal.title}}","text":"{{signal.summary_md}}"}`}
          />
        </FormField>
      </div>
      {state.error ? (
        <p className="text-sm text-accent-deep">{state.error}</p>
      ) : null}
      {!onCreated && state.notice ? (
        <p className="text-sm text-muted">{state.notice}</p>
      ) : null}
      {!onCreated && state.secretShownOnce ? (
        <ShowOnceSecret value={state.secretShownOnce} />
      ) : null}
      <SubmitButton label="Add subscriber" isPending={isPending} />
    </form>
  );
}

export function CreatePullSubscriptionForm({
  feedId,
  onCreated,
}: {
  feedId: string;
  onCreated?: (created: CreatedSubscription) => void;
}) {
  const [state, formAction, isPending] = useActionState<
    SubscriptionCreateResult,
    FormData
  >(createPullSubscriptionAction, {});
  useCreatedCallback(state, onCreated);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="feed_id" value={feedId} />
      <FormField label="Name">
        <input
          name="name"
          required
          maxLength={120}
          className={INPUT_CLASSES}
          placeholder="Claude Code companion"
        />
      </FormField>
      <FormField label="Subscriber kind">
        <select name="subscriber_kind" className={INPUT_CLASSES} defaultValue="agent">
          <option value="agent">Agent (polls the feed)</option>
          <option value="web_service">Web service (polls the feed)</option>
        </select>
      </FormField>
      {state.error ? (
        <p className="text-sm text-accent-deep">{state.error}</p>
      ) : null}
      {!onCreated && state.notice ? (
        <p className="text-sm text-muted">{state.notice}</p>
      ) : null}
      {!onCreated && state.secretShownOnce ? (
        <ShowOnceSecret value={state.secretShownOnce} />
      ) : null}
      <SubmitButton label="Add subscriber" isPending={isPending} />
    </form>
  );
}
