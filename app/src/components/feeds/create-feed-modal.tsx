"use client";

/** Feed creation modal, opened from the "+" tab or the empty state. */
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import { createFeedAction } from "@/app/(dashboard)/feeds/actions";
import { ActionForm } from "@/components/shared/action-form";
import { FormField } from "@/components/shared/form-field";
import { INPUT_CLASSES } from "@/components/shared/form-styles";
import { Modal } from "@/components/shared/modal";

export function CreateFeedModal({
  trigger,
}: {
  /** "tab" renders the small + tab button; "button" a labeled button. */
  trigger: "tab" | "button";
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {trigger === "tab" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="New feed"
          className="ml-1 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          <IconPlus size={16} stroke={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
        >
          <IconPlus size={15} stroke={2} />
          New feed
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="New feed"
        description="A feed collects signals from the radars you attach to it. Users, services, and agents subscribe to feeds."
      >
        <ActionForm
          action={createFeedAction}
          submitLabel="Create feed"
          onCancel={() => setIsOpen(false)}
        >
          <FormField label="Name">
            <input
              name="name"
              required
              maxLength={120}
              className={INPUT_CLASSES}
              placeholder="Market watch"
            />
          </FormField>
          <FormField label="Description" description="Optional" isMultiline>
            <textarea
              name="description_md"
              rows={2}
              className={INPUT_CLASSES}
              placeholder="What this feed is for."
            />
          </FormField>
        </ActionForm>
      </Modal>
    </>
  );
}
