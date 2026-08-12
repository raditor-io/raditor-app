"use client";

/**
 * "Add subscriber" flow: one button opens a modal with a segmented type
 * switch (Webhook | Polling); the matching form renders below. After
 * creation the modal switches to a success view titled with the
 * subscriber's name, showing only the notice and the show-once
 * secret/token pane.
 */
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import {
  CreatePullSubscriptionForm,
  CreateWebhookSubscriptionForm,
  ShowOnceSecret,
  type CreatedSubscription,
} from "@/components/feeds/subscription-forms";
import { Modal } from "@/components/shared/modal";

type SubscriberType = "webhook" | "polling";

const TYPE_OPTIONS: Array<{ value: SubscriberType; label: string; hint: string }> = [
  {
    value: "webhook",
    label: "Webhook",
    hint: "Raditor pushes signed deliveries to an https endpoint.",
  },
  {
    value: "polling",
    label: "Polling",
    hint: "The subscriber pulls new items with an API token and cursor.",
  },
];

export function AddSubscriberModal({ feedId }: { feedId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<SubscriberType>("webhook");
  const [created, setCreated] = useState<CreatedSubscription | null>(null);

  function close() {
    setIsOpen(false);
    setCreated(null);
    setType("webhook");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
      >
        <IconPlus size={15} stroke={2} />
        Add
      </button>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={created ? created.name : "Add subscriber"}
        description={created ? undefined : "How should this subscriber receive the feed?"}
      >
        {created ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{created.notice}</p>
            <ShowOnceSecret value={created.secretShownOnce} />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="cursor-pointer rounded-md border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-hover"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              role="radiogroup"
              aria-label="Subscriber type"
              className="mb-1 grid grid-cols-2 gap-2"
            >
              {TYPE_OPTIONS.map((option) => {
                const isActive = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setType(option.value)}
                    className={`cursor-pointer rounded-md border px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-border-strong"
                    }`}
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              {type === "webhook" ? (
                <CreateWebhookSubscriptionForm
                  feedId={feedId}
                  onCreated={setCreated}
                />
              ) : (
                <CreatePullSubscriptionForm
                  feedId={feedId}
                  onCreated={setCreated}
                />
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
