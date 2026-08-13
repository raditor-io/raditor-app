"use client";

/**
 * Generic client wrapper for server-action forms: renders server-provided
 * fields (children), a right-aligned footer (optional Cancel + submit), and
 * the action's error/notice. With `requireDirty`, the submit stays disabled
 * until a field changes and re-disables after a successful save.
 */
import { useActionState, useEffect, useRef, useState } from "react";

export interface ActionResult {
  error?: string;
  notice?: string;
}

export interface ActionFormProps {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  /** Defaults to "Save" (settings convention). */
  submitLabel?: string;
  /** Disable submit until a field changed; re-disables after success. */
  requireDirty?: boolean;
  /** Called when the action reports success (e.g. to close a modal). */
  onSuccess?: () => void;
  /** Renders a secondary Cancel button next to submit. */
  onCancel?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ActionForm({
  action,
  submitLabel = "Save",
  requireDirty = false,
  onSuccess,
  onCancel,
  children,
  className,
}: ActionFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [isDirty, setIsDirty] = useState(false);
  const lastState = useRef<ActionResult>(state);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.notice) {
      setIsDirty(false);
      onSuccess?.();
    }
  }, [state, onSuccess]);

  const isSubmitDisabled = isPending || (requireDirty && !isDirty);

  return (
    <form
      action={formAction}
      onInput={() => setIsDirty(true)}
      className={className ?? "space-y-3"}
    >
      {children}
      {state.error ? (
        <p className="text-sm text-accent-deep">{state.error}</p>
      ) : null}
      {state.notice ? <p className="text-sm text-muted">{state.notice}</p> : null}
      {/* Full-bleed footer strip (Vercel card anatomy); parents use p-6. */}
      <div className="-mx-6 mt-4 flex items-center justify-end gap-2 border-t border-border px-6 pt-4">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-hover"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="cursor-pointer rounded-md border border-transparent bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep disabled:cursor-not-allowed disabled:border-border disabled:bg-hover disabled:text-faint"
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// INPUT_CLASSES lives in ./form-styles and field rows in ./form-field (plain
// modules): server components must not import values through this
// "use client" file.
