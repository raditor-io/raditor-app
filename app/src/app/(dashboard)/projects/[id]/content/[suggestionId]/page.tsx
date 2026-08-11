import { IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { serverClient } from "@/lib/supabase/server";
import { getProject } from "@/services/project";
import {
  getSuggestion,
  listSiblings,
  suggestionCostUsd,
} from "@/services/suggestion";

import { decideSuggestionAction } from "./actions";

export const metadata = { title: "Suggestion | Raditor" };

interface EvidenceEntry {
  kind?: string;
  title?: string;
  url?: string | null;
}

export default async function SuggestionDetailPage({
  params,
}: {
  params: Promise<{ id: string; suggestionId: string }>;
}) {
  const { id, suggestionId } = await params;
  const suggestion = await getSuggestion(suggestionId);
  if (!suggestion || suggestion.project_id !== id) notFound();

  const supabase = await serverClient();
  const [siblings, costUsd, signal, drafts, pullRequest] = await Promise.all([
    listSiblings(suggestion),
    suggestionCostUsd(suggestionId),
    suggestion.signal_id
      ? supabase
          .from("signals")
          .select("evidence, title")
          .eq("id", suggestion.signal_id)
          .maybeSingle()
          .then((r) => r.data)
      : null,
    supabase
      .from("content_drafts")
      .select("*")
      .eq("suggestion_id", suggestionId)
      .order("file_path")
      .then((r) => r.data ?? []),
    supabase
      .from("github_pull_requests")
      .select("*")
      .eq("suggestion_id", suggestionId)
      .maybeSingle()
      .then((r) => r.data),
  ]);
  const siblingProjects =
    siblings.length > 0
      ? await Promise.all(
          siblings.map(async (s) => ({
            suggestion: s,
            project: await getProject(s.project_id),
          })),
        )
      : [];

  const evidence = ((signal?.evidence ?? []) as EvidenceEntry[]).filter(Boolean);
  const isDecidable =
    suggestion.status === "open" || suggestion.status === "elaborated";
  const graphOperations =
    (suggestion.graph_impact as { operations?: Array<Record<string, string>> })
      ?.operations ?? [];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {suggestion.title || "Untitled suggestion"}
            </h2>
            <p className="mt-1 text-xs text-faint">
              {new Date(suggestion.created_at).toLocaleString()}
              {suggestion.relevance_score !== null
                ? ` · relevance ${suggestion.relevance_score}/100`
                : ""}
              {costUsd > 0 ? ` · ~$${costUsd.toFixed(4)} AI cost` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted">
            {suggestion.status}
          </span>
        </div>

        <FourPart label="Signal" body={suggestion.signal_summary_md} />
        <FourPart label="Recommendation" body={suggestion.recommendation_md} />
        <FourPart label="Reason" body={suggestion.reason_md} />

        <div className="mt-4">
          <h3 className="text-sm font-medium text-foreground">Graph impact</h3>
          {graphOperations.length === 0 ? (
            <p className="mt-1 text-sm text-faint">No graph operations.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {graphOperations.map((op, i) => (
                <li
                  key={i}
                  className="rounded-md bg-hover px-3 py-2 font-mono text-xs text-foreground"
                >
                  {op.op}: {op.file_path ?? op.from_url_path ?? ""}
                  {op.summary_of_change ? ` — ${op.summary_of_change}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        {evidence.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground">Evidence</h3>
            <ul className="mt-1 space-y-1">
              {evidence.map((entry, i) => (
                <li key={i} className="text-sm">
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      {entry.title ?? entry.url}
                      <IconExternalLink size={14} stroke={1.75} />
                    </a>
                  ) : (
                    <span className="text-muted">{entry.title}</span>
                  )}
                  <span className="ml-1.5 text-xs text-faint">
                    {entry.kind}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {isDecidable ? (
          <div className="-mx-6 mt-5 flex items-center justify-end gap-2 border-t border-border px-6 pt-4">
            <form action={decideSuggestionAction}>
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="suggestion_id" value={suggestion.id} />
              <input type="hidden" name="decision" value="dismissed" />
              <button
                type="submit"
                className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-hover"
              >
                Dismiss
              </button>
            </form>
            <form action={decideSuggestionAction}>
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="suggestion_id" value={suggestion.id} />
              <input type="hidden" name="decision" value="accepted" />
              <button
                type="submit"
                className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
              >
                Accept
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {pullRequest ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground">Pull request</h3>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs capitalize ${
                pullRequest.status === "merged"
                  ? "border-success/40 text-success"
                  : pullRequest.status === "open"
                    ? "border-accent/40 text-accent"
                    : "border-border text-faint"
              }`}
            >
              {pullRequest.status}
            </span>
          </div>
          <a
            href={`https://github.com/${pullRequest.repo_full_name}/pull/${pullRequest.pr_number}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            {pullRequest.repo_full_name}#{pullRequest.pr_number}
            <IconExternalLink size={14} stroke={1.75} />
          </a>
          <span className="ml-2 text-xs text-faint">
            branch {pullRequest.branch_name}
          </span>
        </div>
      ) : null}

      {drafts.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="text-sm font-medium text-foreground">
            Drafted files
          </h3>
          <div className="mt-2 space-y-2">
            {drafts.map((draft) => (
              <details
                key={draft.id}
                className="rounded-lg border border-border bg-surface"
              >
                <summary className="px-4 py-2.5 font-mono text-xs text-foreground hover:bg-hover">
                  {draft.file_path}
                </summary>
                <pre className="max-h-96 overflow-auto border-t border-border bg-hover px-4 py-3 font-mono text-xs whitespace-pre-wrap text-foreground">
                  {draft.draft_content}
                </pre>
              </details>
            ))}
          </div>
        </div>
      ) : suggestion.status === "accepted" && !pullRequest ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-6 text-sm text-muted">
          Drafts are being rendered; the pull request opens when they are
          ready. In dev, pump the publish queue to proceed.
        </div>
      ) : null}

      {siblingProjects.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="text-sm font-medium text-foreground">
            Also proposed from this signal
          </h3>
          <ul className="mt-2 space-y-1">
            {siblingProjects.map(({ suggestion: sibling, project }) => (
              <li key={sibling.id} className="text-sm">
                <Link
                  href={`/projects/${sibling.project_id}/content/${sibling.id}`}
                  className="text-accent hover:underline"
                >
                  {project?.display_name ?? "Other project"}:{" "}
                  {sibling.title || "Untitled"}
                </Link>
                <span className="ml-1.5 text-xs capitalize text-faint">
                  ({sibling.status})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FourPart({ label, body }: { label: string; body: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-foreground">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{body}</p>
    </div>
  );
}
