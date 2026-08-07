export interface EmptyStateProps {
  title: string;
  description: string;
  phaseNote?: string;
}

/** Placeholder panel for sections whose functionality lands in a later phase. */
export function EmptyState({ title, description, phaseNote }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      {phaseNote ? (
        <p className="mt-4 text-xs uppercase tracking-wide text-faint">
          {phaseNote}
        </p>
      ) : null}
    </div>
  );
}
