import {
  IconBrandGithub,
  IconRadar2,
  IconWorldSearch,
} from "@tabler/icons-react";
import Link from "next/link";

import { CreateRadarModal } from "@/components/radars/create-radar-modal";
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
import { requireOrgContext } from "@/services/org";
import {
  listAvailableRepos,
  listRadarsPaged,
  listTargets,
} from "@/services/radar";

export const metadata = { title: "Radars | Raditor" };

const COLUMNS: ListColumn[] = [
  { label: "Radar" },
  { label: "Targets", className: "hidden w-64 sm:table-cell" },
  { label: "Last scanned", className: "hidden w-52 md:table-cell" },
  { label: "Actions", className: "w-14", isLabelHidden: true },
];

/** The radar list. */
export default async function RadarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireOrgContext();
  const params = parseListParams(await searchParams);
  const { rows: radars, total } = await listRadarsPaged(params);

  const targetsByRadar = new Map(
    await Promise.all(
      radars.map(
        async (radar) => [radar.id, await listTargets(radar.id)] as const,
      ),
    ),
  );
  const availableRepos = ctx.isAdmin
    ? await listAvailableRepos().catch(() => [])
    : [];
  const repoOptions = availableRepos.map((repo) => ({
    value: `${repo.githubInstallationId}::${repo.fullName}`,
    label: repo.fullName,
  }));

  return (
    <ListView>
      <ListHeader
        searchPlaceholder="Search radars..."
        params={params}
        action={ctx.isAdmin ? <CreateRadarModal repoOptions={repoOptions} /> : null}
      />

      <ListTable columns={COLUMNS}>
        {radars.length === 0 ? (
          <ListEmpty colSpan={COLUMNS.length}>
            {params.q
              ? "No radars match your search."
              : "No radars yet. Create your first radar with a one-sentence directive and let it scan for signals."}
          </ListEmpty>
        ) : (
          radars.map((radar) => {
            const targets = targetsByRadar.get(radar.id) ?? [];
            const repoNames = targets
              .map((t) => t.github_repo_full_name)
              .filter(Boolean);
            return (
              <tr key={radar.id} className="transition-colors hover:bg-hover">
                <td className="px-4 py-3">
                  <Link
                    href={`/radars/${radar.id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <IconRadar2
                      size={18}
                      stroke={1.75}
                      className="shrink-0 text-muted"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {radar.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {radar.directive_md}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="flex items-center gap-1.5 text-xs text-faint">
                    {repoNames.length > 0 ? (
                      <>
                        <IconBrandGithub
                          size={14}
                          stroke={1.75}
                          className="shrink-0"
                        />
                        <span className="truncate">{repoNames.join(", ")}</span>
                      </>
                    ) : (
                      <>
                        <IconWorldSearch
                          size={14}
                          stroke={1.75}
                          className="shrink-0"
                        />
                        open web
                      </>
                    )}
                  </span>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="block truncate text-xs text-faint">
                    {radar.last_scanned_at
                      ? `scanned ${new Date(radar.last_scanned_at).toLocaleString()}`
                      : "never scanned"}
                  </span>
                </td>
                <td className="py-3 pl-2 pr-3">
                  <RowMenu
                    label={`Actions for ${radar.name}`}
                    items={[
                      { label: "Open", href: `/radars/${radar.id}` },
                      { label: "Signals", href: `/radars/${radar.id}/signals` },
                      { label: "Settings", href: `/radars/${radar.id}/settings` },
                    ]}
                  />
                </td>
              </tr>
            );
          })
        )}
      </ListTable>

      <ListFooter
        basePath="/radars"
        params={params}
        total={total}
        shownCount={radars.length}
      />
    </ListView>
  );
}
