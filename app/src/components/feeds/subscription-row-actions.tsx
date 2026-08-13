"use client";

/**
 * Admin actions on a subscriber row, as icon buttons: Edit (pencil, opens a
 * modal prefilled with the non-secret fields), Activate/Deactivate
 * (play/pause), Delete (trash, with confirm). In-app subscriptions carry no
 * Edit — nothing on them is editable.
 */
import {
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

import {
  deleteSubscriptionAction,
  setSubscriptionActiveAction,
} from "@/app/(dashboard)/feeds/actions";
import {
  EditPullSubscriptionForm,
  EditWebhookSubscriptionForm,
  type EditableSubscription,
} from "@/components/feeds/subscription-forms";
import { Modal } from "@/components/shared/modal";

const ICON_BUTTON_CLASSES =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground";

export function SubscriptionRowActions({
  feedId,
  subscription,
}: {
  feedId: string;
  subscription: EditableSubscription;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const isEditable =
    subscription.transport === "pushed_webhook" ||
    subscription.transport === "pulled_feed";
  const activeToggleLabel = subscription.isActive ? "Deactivate" : "Activate";

  return (
    <span className="flex shrink-0 items-center gap-1">
      {isEditable ? (
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          aria-label={`Edit ${subscription.name}`}
          title="Edit"
          className={ICON_BUTTON_CLASSES}
        >
          <IconPencil size={15} stroke={1.75} />
        </button>
      ) : null}
      <form action={setSubscriptionActiveAction}>
        <input type="hidden" name="feed_id" value={feedId} />
        <input type="hidden" name="subscription_id" value={subscription.id} />
        <input
          type="hidden"
          name="is_active"
          value={subscription.isActive ? "false" : "true"}
        />
        <button
          type="submit"
          aria-label={`${activeToggleLabel} ${subscription.name}`}
          title={activeToggleLabel}
          className={ICON_BUTTON_CLASSES}
        >
          {subscription.isActive ? (
            <IconPlayerPause size={15} stroke={1.75} />
          ) : (
            <IconPlayerPlay size={15} stroke={1.75} />
          )}
        </button>
      </form>
      <form action={deleteSubscriptionAction} ref={deleteFormRef}>
        <input type="hidden" name="feed_id" value={feedId} />
        <input type="hidden" name="subscription_id" value={subscription.id} />
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Delete the subscription "${subscription.name}"? Its delivery history is removed too.`,
              )
            ) {
              deleteFormRef.current?.requestSubmit();
            }
          }}
          aria-label={`Delete ${subscription.name}`}
          title="Delete"
          className={`${ICON_BUTTON_CLASSES} hover:text-accent-deep`}
        >
          <IconTrash size={15} stroke={1.75} />
        </button>
      </form>
      {isEditable ? (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit ${subscription.name}`}
        >
          {subscription.transport === "pushed_webhook" ? (
            <EditWebhookSubscriptionForm
              feedId={feedId}
              subscription={subscription}
              onSaved={() => setIsEditOpen(false)}
              onCancel={() => setIsEditOpen(false)}
            />
          ) : (
            <EditPullSubscriptionForm
              feedId={feedId}
              subscription={subscription}
              onSaved={() => setIsEditOpen(false)}
              onCancel={() => setIsEditOpen(false)}
            />
          )}
        </Modal>
      ) : null}
    </span>
  );
}
