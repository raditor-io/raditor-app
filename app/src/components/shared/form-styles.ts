/**
 * Shared form control classes. Plain module (no "use client") on purpose:
 * server components import these too, and importing values from a client
 * module would turn them into client references instead of strings.
 */

export const INPUT_CLASSES =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none";

export const LABEL_CLASSES = "mb-1 block text-sm text-muted";
