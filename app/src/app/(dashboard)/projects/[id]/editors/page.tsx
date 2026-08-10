import { IconUserHexagon } from "@tabler/icons-react";
import Link from "next/link";

import { listAssignedEditorIds, listEditors } from "@/services/editor";
import { requireOrgContext } from "@/services/org";

import { toggleAssignmentAction } from "./actions";

export const metadata = { title: "Editors | Raditor" };

export default async function ProjectEditorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const [editors, assignedIds] = await Promise.all([
    listEditors(),
    listAssignedEditorIds(id),
  ]);

  if (editors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center">
        <h2 className="text-base font-medium text-foreground">
          No editors in this organization yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Editors are shared across the organization and assigned to projects.
        </p>
        {ctx.isAdmin ? (
          <Link
            href="/editors/new"
            className="mt-4 inline-block rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
          >
            Create an editor
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted">
        Editors assigned to this project evaluate its signals and draft its
        suggestions. Personas are managed in the{" "}
        <Link href="/editors" className="text-accent hover:underline">
          org editor pool
        </Link>
        .
      </p>
      <ul className="mt-4 space-y-2">
        {editors.map((editor) => {
          const isAssigned = assignedIds.includes(editor.id);
          return (
            <li
              key={editor.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:border-border-strong"
            >
              <Link
                href={`/editors/${editor.id}`}
                className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground hover:text-accent"
              >
                <IconUserHexagon
                  size={18}
                  stroke={1.75}
                  className="shrink-0 text-muted"
                />
                <span className="truncate">{editor.display_name}</span>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                  {isAssigned ? "assigned" : "not assigned"}
                </span>
                {ctx.isAdmin ? (
                  <form action={toggleAssignmentAction}>
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="editor_id" value={editor.id} />
                    <input
                      type="hidden"
                      name="assign"
                      value={isAssigned ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className={
                        isAssigned
                          ? "text-xs text-accent-deep hover:underline"
                          : "text-xs text-accent hover:underline"
                      }
                    >
                      {isAssigned ? "Unassign" : "Assign"}
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
