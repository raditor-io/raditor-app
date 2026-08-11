"use client";

/**
 * Sentence-first radar creation (Vercel-style modal): a directive in prose,
 * optionally grounded with a repo target. ai_briefing / fetched_websites are
 * visible but disabled until Phase 7 ships their scan strategies.
 */
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import { createRadarAction } from "@/app/(dashboard)/projects/[id]/radar/actions";
import { RepoSelect, type RepoOption } from "@/components/github/repo-select";
import { ActionForm } from "@/components/shared/action-form";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/shared/form-styles";
import { Modal } from "@/components/shared/modal";

export function CreateRadarModal({
  projectId,
  repoOptions,
}: {
  projectId: string;
  repoOptions: RepoOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
      >
        <IconPlus size={15} stroke={2} />
        New radar
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="New radar"
        description="Tell the radar what to watch and why it matters for this project. Scans turn what it finds into signals your editors evaluate."
      >
        <ActionForm
          action={createRadarAction}
          submitLabel="Create radar"
          onCancel={() => setIsOpen(false)}
        >
          <input type="hidden" name="project_id" value={projectId} />
          <label className="block">
            <span className={LABEL_CLASSES}>Name</span>
            <input
              name="name"
              required
              maxLength={120}
              className={INPUT_CLASSES}
              placeholder="Product repo"
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>Directive</span>
            <textarea
              name="directive_md"
              required
              rows={3}
              className={INPUT_CLASSES}
              placeholder="Watch our product repository for releases and merged changes relevant to this site."
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>
              Repository target (optional)
            </span>
            <RepoSelect
              name="repo_choice"
              options={repoOptions}
              placeholder="No repository target"
              returnTo={`/projects/${projectId}/radar`}
            />
          </label>
          <fieldset>
            <legend className={LABEL_CLASSES}>Scan strategies</legend>
            <div className="space-y-1.5 text-sm text-muted">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="strategy_target_emitted_events"
                  defaultChecked
                />
                Target-emitted events (GitHub webhooks)
              </label>
              <label className="flex items-center gap-1.5 opacity-50">
                <input type="checkbox" name="strategy_ai_briefing" disabled />
                AI briefing (web hunt) — arrives in Phase 7
              </label>
              <label className="flex items-center gap-1.5 opacity-50">
                <input type="checkbox" name="strategy_fetched_websites" disabled />
                Fetched websites — arrives in Phase 7
              </label>
            </div>
          </fieldset>
        </ActionForm>
      </Modal>
    </>
  );
}
