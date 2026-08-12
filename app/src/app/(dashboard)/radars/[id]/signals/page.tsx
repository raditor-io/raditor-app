import { IconRadar2 } from "@tabler/icons-react";
import { notFound } from "next/navigation";

import { ListParamSelect } from "@/components/shared/list-controls";
import {
  ListEmpty,
  ListFooter,
  ListHeader,
  ListTable,
  ListView,
  type ListColumn,
} from "@/components/shared/list-view";
import { RowMenu } from "@/components/shared/row-menu";
import { parseListParams } from "@/lib/list-params";
import {
  getRadar,
  listSignalKinds,
  listSignalsPaged,
} from "@/services/radar";

export const metadata = { title: "Signals | Raditor" };

interface EvidenceEntry {
  url?: string | null;
  title?: string | null;
}

const COLUMNS: ListColumn[] = [
  { label: "Signal" },
  { label: "Kind", className: "hidden w-36 sm:table-cell" },
  { label: "Occurred", className: "hidden w-48 md:table-cell" },
  { label: "Actions", className: "w-14", isLabelHidden: true },
];

export default async function RadarSignalsPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await routeParams;
  const radar = await getRadar(id);
  if (!radar) notFound();

  const params = parseListParams(await searchParams);
  const [{ rows: signals, total }, kinds] = await Promise.all([
    listSignalsPaged(id, params),
    listSignalKinds(id),
  ]);

  return (
    <ListView>
      <ListHeader
        searchPlaceholder="Search signals..."
        params={params}
        filter={
          kinds.length > 0 ? (
            <ListParamSelect
              name="kind"
              value={params.kind}
              ariaLabel="Filter by kind"
              options={[
                { value: "", label: "All kinds" },
                ...kinds.map((kind) => ({
                  value: kind,
                  label: kind.replaceAll("_", " "),
                })),
              ]}
            />
          ) : null
        }
      />

      <ListTable columns={COLUMNS}>
        {signals.length === 0 ? (
          <ListEmpty colSpan={COLUMNS.length}>
            {params.q || params.kind
              ? "No signals match your filters."
              : "No signals yet. Signals appear when a scan finds something new on this radar's matter."}
          </ListEmpty>
        ) : (
          signals.map((signal) => {
            const evidence = Array.isArray(signal.evidence)
              ? (signal.evidence as EvidenceEntry[])
              : [];
            return (
              <tr key={signal.id} className="transition-colors hover:bg-hover">
                <td className="px-4 py-3">
                  <span className="flex min-w-0 items-start gap-2.5">
                    <IconRadar2
                      size={16}
                      stroke={1.75}
                      className="mt-0.5 shrink-0 text-muted"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {signal.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">
                        {signal.summary_md}
                      </span>
                      {evidence.length > 0 ? (
                        <span className="mt-1 flex flex-wrap gap-2">
                          {evidence.slice(0, 3).map((entry, i) =>
                            entry.url ? (
                              <a
                                key={i}
                                href={entry.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer truncate text-xs text-accent hover:underline"
                              >
                                {entry.title || entry.url}
                              </a>
                            ) : null,
                          )}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-top sm:table-cell">
                  <span className="inline-block max-w-full truncate rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                    {signal.kind.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-top md:table-cell">
                  <time className="block truncate text-xs text-faint">
                    {new Date(signal.occurred_at).toLocaleString()}
                  </time>
                </td>
                <td className="py-3 pl-2 pr-3 align-top">
                  <RowMenu
                    label={`Actions for ${signal.title}`}
                    items={evidence
                      .filter((entry) => entry.url)
                      .slice(0, 3)
                      .map((entry) => ({
                        label: `Source: ${entry.title || entry.url}`,
                        href: entry.url as string,
                        isExternal: true,
                      }))}
                  />
                </td>
              </tr>
            );
          })
        )}
      </ListTable>

      <ListFooter
        basePath={`/radars/${id}/signals`}
        params={params}
        total={total}
        shownCount={signals.length}
      />
    </ListView>
  );
}
