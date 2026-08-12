import { IconBrandGithub, IconWorldSearch } from "@tabler/icons-react";
import { notFound } from "next/navigation";

import { getRadar, listScans, listTargets } from "@/services/radar";

export const metadata = { title: "Radar | Raditor" };

export default async function RadarOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const radar = await getRadar(id);
  if (!radar) notFound();

  const [targets, scans] = await Promise.all([listTargets(id), listScans(id)]);

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          Directive
        </h2>
        <p className="text-sm text-muted">{radar.directive_md}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-faint">
          {radar.scan_strategies.map((strategy) => (
            <span
              key={strategy}
              className="rounded-full border border-border px-2 py-0.5"
            >
              {strategy.replaceAll("_", " ")}
            </span>
          ))}
          <span>every {radar.scan_interval_minutes} min</span>
          <span>
            {radar.last_scanned_at
              ? `last scanned ${new Date(radar.last_scanned_at).toLocaleString()}`
              : "never scanned"}
          </span>
        </p>
        {targets.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {targets.map((target) => (
              <li
                key={target.id}
                className="flex items-center gap-2 text-sm text-muted"
              >
                {target.github_repo_full_name ? (
                  <IconBrandGithub size={14} stroke={1.75} />
                ) : (
                  <IconWorldSearch size={14} stroke={1.75} />
                )}
                {target.github_repo_full_name ?? target.target_kind}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Recent scans
        </h2>
        {scans.length === 0 ? (
          <p className="text-sm text-faint">
            No scans yet. Scans run on the interval, or immediately when
            events arrive from a target.
          </p>
        ) : (
          <ul className="space-y-2">
            {scans.map((scan) => {
              const stats = (scan.stats ?? {}) as Record<string, unknown>;
              return (
                <li
                  key={scan.id}
                  className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-foreground">
                        {new Date(scan.started_at).toLocaleString()}
                      </span>
                      <span className="ml-2 text-xs text-faint">
                        {scan.trigger === "target_events"
                          ? "event-triggered"
                          : "interval"}{" "}
                        · {Number(stats.events_consumed ?? 0)} events ·{" "}
                        {Number(stats.signals_created ?? 0)} signals ·{" "}
                        {Number(stats.feed_items_created ?? 0)} feed items
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                        scan.status === "succeeded"
                          ? "border-success/40 text-success"
                          : scan.status === "failed"
                            ? "border-accent-deep/40 text-accent-deep"
                            : "border-border text-muted"
                      }`}
                    >
                      {scan.status}
                    </span>
                  </div>
                  {scan.summary_md ? (
                    <p className="mt-1.5 whitespace-pre-line text-xs text-muted">
                      {scan.summary_md}
                    </p>
                  ) : null}
                  {scan.error_message ? (
                    <p className="mt-1.5 font-mono text-xs text-accent-deep">
                      {scan.error_message}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
