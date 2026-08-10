import { ActionForm } from "@/components/shared/action-form";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/shared/form-styles";
import { PERSONA_PRESETS } from "@/ai/personas";
import { requireOrgContext } from "@/services/org";

import { createEditorAction } from "../actions";

export const metadata = { title: "New editor | Raditor" };

export default async function NewEditorPage() {
  const ctx = await requireOrgContext();

  if (!ctx.isAdmin) {
    return (
      <p className="max-w-md rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Creating editors requires the admin role.
      </p>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-lg border border-border bg-surface p-6">
        <ActionForm action={createEditorAction} submitLabel="Create editor">
          <label className="block">
            <span className={LABEL_CLASSES}>Name</span>
            <input
              name="display_name"
              required
              maxLength={120}
              className={INPUT_CLASSES}
              placeholder="Docs editor"
            />
          </label>
          <fieldset>
            <legend className={LABEL_CLASSES}>Persona preset</legend>
            <div className="space-y-2">
              {PERSONA_PRESETS.map((preset, i) => (
                <label
                  key={preset.key}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:border-border-strong"
                >
                  <input
                    type="radio"
                    name="preset_key"
                    value={preset.key}
                    defaultChecked={i === 1}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-foreground">
                      {preset.displayName}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {preset.key === "conservative"
                        ? "Evidence-strict, minimal diffs, silence over noise."
                        : preset.key === "balanced"
                          ? "Clear and concrete, one well-scoped suggestion at a time."
                          : "Opportunity-seeking, comfortable with narrative content."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-faint">
            The persona is a markdown document you can fully edit after
            creation.
          </p>
        </ActionForm>
      </div>
    </div>
  );
}
