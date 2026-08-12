"use client";

/**
 * Sentence-first radar creation (Vercel-style modal): a directive in prose,
 * optionally grounded with a repo target.
 */
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import { createRadarAction } from "@/app/(dashboard)/radars/actions";
import { RepoSelect, type RepoOption } from "@/components/github/repo-select";
import { ActionForm } from "@/components/shared/action-form";
import { FormField, FormFieldGroup } from "@/components/shared/form-field";
import { INPUT_CLASSES } from "@/components/shared/form-styles";
import { Modal } from "@/components/shared/modal";

export function CreateRadarModal({ repoOptions }: { repoOptions: RepoOption[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
      >
        <IconPlus size={15} stroke={2} />
        New radar
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="New radar"
        description="Tell the radar what to watch and why it matters. Scans turn what it finds into signals that flow into your feeds."
      >
        <ActionForm
          action={createRadarAction}
          submitLabel="Create radar"
          onCancel={() => setIsOpen(false)}
        >
          <FormField label="Name">
            <input
              name="name"
              required
              maxLength={120}
              className={INPUT_CLASSES}
              placeholder="Competitor pricing"
            />
          </FormField>
          <FormField label="Directive" isMultiline>
            <textarea
              name="directive_md"
              required
              rows={3}
              className={INPUT_CLASSES}
              placeholder="Watch our main competitors for pricing changes, new plans, and packaging updates."
            />
          </FormField>
          <FormField label="Repository target" description="Optional">
            <RepoSelect
              name="repo_choice"
              options={repoOptions}
              placeholder="No repository target"
              returnTo="/"
            />
          </FormField>
          <FormFieldGroup label="Scan strategies">
            <div className="space-y-1.5 text-sm text-muted">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="strategy_ai_briefing"
                  defaultChecked
                />
                AI briefing (web hunt driven by the directive)
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="strategy_target_emitted_events"
                />
                Target-emitted events (GitHub webhooks)
              </label>
            </div>
          </FormFieldGroup>
        </ActionForm>
      </Modal>
    </>
  );
}
