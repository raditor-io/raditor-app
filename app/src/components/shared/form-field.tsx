/**
 * Standard form rows, Vercel-style: a small medium-weight label ABOVE the
 * control, optional hint text, full-width input. Plain module (no
 * "use client") so server components can compose it.
 */

const LABEL_TEXT_CLASSES = "text-[13px] font-medium text-foreground";

export function FormField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  /** Kept for call-site compatibility; stacked layout ignores it. */
  isMultiline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={`mb-1.5 block ${LABEL_TEXT_CLASSES}`}>{label}</span>
      <span className="block min-w-0">{children}</span>
      {description ? (
        <span className="mt-1.5 block text-xs text-faint">{description}</span>
      ) : null}
    </label>
  );
}

/** Same anatomy for grouped controls (checkbox sets etc.). */
export function FormFieldGroup({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label}>
      <span className={`mb-1.5 block ${LABEL_TEXT_CLASSES}`}>{label}</span>
      <div className="min-w-0">{children}</div>
      {description ? (
        <span className="mt-1.5 block text-xs text-faint">{description}</span>
      ) : null}
    </div>
  );
}
