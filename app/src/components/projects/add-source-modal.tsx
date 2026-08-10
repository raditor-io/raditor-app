"use client";

/**
 * "Add source" flow as a Vercel-style modal: pick a repository (or connect
 * another GitHub account from within the select), choose what to watch, and
 * the source is created org-level + subscribed to this project.
 */
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import { addRepoSourceAction } from "@/app/(dashboard)/projects/[id]/settings/actions";
import { RepoSelect, type RepoOption } from "@/components/github/repo-select";
import { ActionForm } from "@/components/shared/action-form";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/shared/form-styles";
import { Modal } from "@/components/shared/modal";

export interface AddSourceModalProps {
  projectId: string;
  repoOptions: RepoOption[];
}

export function AddSourceModal({ projectId, repoOptions }: AddSourceModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
      >
        <IconPlus size={15} stroke={2} />
        Add
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add source"
        description="Connect a repository as an org-level source and subscribe this project to it. The radar watches subscribed sources for signals."
      >
        <ActionForm
          action={addRepoSourceAction}
          submitLabel="Add source"
          onCancel={() => setIsOpen(false)}
          onSuccess={() => setIsOpen(false)}
        >
          <input type="hidden" name="project_id" value={projectId} />
          <label className="block">
            <span className={LABEL_CLASSES}>Repository</span>
            <RepoSelect
              name="repo_choice"
              options={repoOptions}
              placeholder="Select a repository"
              returnTo={`/projects/${projectId}/settings`}
              required
            />
          </label>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="is_watching_releases" defaultChecked />
              Releases
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="is_watching_default_branch_merges"
                defaultChecked
              />
              Merges to default branch
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="is_watching_labeled_issues" />
              Labeled issues
            </label>
          </div>
          <label className="block">
            <span className={LABEL_CLASSES}>
              Issue labels to watch (comma-separated, empty = all)
            </span>
            <input
              name="issue_labels"
              className={INPUT_CLASSES}
              placeholder="docs, changelog"
            />
          </label>
        </ActionForm>
      </Modal>
    </>
  );
}
