/**
 * Shared form control classes. Plain module (no "use client") on purpose:
 * server components import these too, and importing values from a client
 * module would turn them into client references instead of strings.
 */

export const INPUT_CLASSES =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint transition-shadow focus:border-border-strong focus:outline-none focus:ring-4 focus:ring-foreground/5";

// Field labels: use FormField / FormFieldGroup (label-left rows) from
// ./form-field instead of ad-hoc label markup.
