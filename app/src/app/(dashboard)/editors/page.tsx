import { IconPlus, IconUserHexagon } from "@tabler/icons-react";
import Link from "next/link";

import { listEditors } from "@/services/editor";
import { requireOrgContext } from "@/services/org";

export const metadata = { title: "Editors | Raditor" };

export default async function EditorsPage() {
  const ctx = await requireOrgContext();
  const editors = await listEditors();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          An editor has a persona and serves one or more projects. Start from
          a preset persona and make it yours.
        </p>
        {ctx.isAdmin ? (
          <Link
            href="/editors/new"
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
          >
            <IconPlus size={16} stroke={2} />
            New editor
          </Link>
        ) : null}
      </div>

      {editors.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center">
          <h2 className="text-base font-medium text-foreground">
            No editors yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Create your first editor from a preset persona: Conservative,
            Balanced, or Proactive.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {editors.map((editor) => (
            <li key={editor.id}>
              <Link
                href={`/editors/${editor.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                  <IconUserHexagon
                    size={18}
                    stroke={1.75}
                    className="shrink-0 text-muted"
                  />
                  <span className="truncate">{editor.display_name}</span>
                </span>
                <span className="shrink-0 text-xs text-faint">
                  {new Date(editor.created_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
