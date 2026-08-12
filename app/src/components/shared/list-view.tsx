/**
 * The standard list-view template (Vercel list anatomy): a full-width column
 * with a header row (search + optional filter + primary action), a table-like
 * body with labeled columns and a per-row action menu, and a footer with
 * result counts, pagination, and items-per-page. Server-composable;
 * interactive bits live in list-controls.tsx and row-menu.tsx.
 */
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";

import { ListParamSelect } from "@/components/shared/list-controls";
import {
  DEFAULT_PER_PAGE,
  listHref,
  PER_PAGE_OPTIONS,
  type ListParams,
} from "@/lib/list-params";

/** The one list width: every list view (feeds, radars, signals) centers on it. */
export const LIST_WIDTH_CLASSES = "mx-auto w-full max-w-6xl";

export function ListView({ children }: { children: React.ReactNode }) {
  return <div className={LIST_WIDTH_CLASSES}>{children}</div>;
}

export function ListHeader({
  searchPlaceholder,
  params,
  filter,
  action,
}: {
  searchPlaceholder: string;
  params: ListParams;
  /** Optional filter control (e.g. a kind ListParamSelect). */
  filter?: React.ReactNode;
  /** Primary action, right-aligned (e.g. a create button/modal). */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {/* GET form: submitting rewrites ?q= on the same path. */}
      <form method="get" className="relative min-w-0 flex-1">
        <IconSearch
          size={15}
          stroke={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none"
        />
        {params.kind ? <input type="hidden" name="kind" value={params.kind} /> : null}
        {params.perPage !== DEFAULT_PER_PAGE ? (
          <input type="hidden" name="per_page" value={params.perPage} />
        ) : null}
      </form>
      {filter}
      {action}
    </div>
  );
}

export interface ListColumn {
  label: string;
  /** Width/visibility classes on the header cell, e.g. "hidden w-52 md:table-cell". */
  className?: string;
  /** Render the label for screen readers only (the actions column). */
  isLabelHidden?: boolean;
}

/**
 * Bordered table body: a header row of column labels above the data rows.
 * Rows are plain <tr> elements; no overflow clipping so row menus can
 * escape the container.
 */
export function ListTable({
  columns,
  children,
}: {
  columns: ListColumn[];
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={`px-4 py-2.5 text-left text-xs font-medium text-muted ${column.className ?? ""}`}
              >
                {column.isLabelHidden ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function ListEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

function PageLink({
  href,
  isDisabled,
  ariaLabel,
  children,
}: {
  href: string;
  isDisabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  if (isDisabled) {
    return (
      <span className="flex size-8 items-center justify-center rounded-md text-faint">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export function ListFooter({
  basePath,
  params,
  total,
  shownCount,
}: {
  basePath: string;
  params: ListParams;
  total: number;
  shownCount: number;
}) {
  const pages = Math.max(1, Math.ceil(total / params.perPage));
  const from = total === 0 ? 0 : (params.page - 1) * params.perPage + 1;
  const to = total === 0 ? 0 : from + shownCount - 1;
  const isFirst = params.page <= 1;
  const isLast = params.page >= pages;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span>
        Showing {from} to {to} of {total} result{total === 1 ? "" : "s"}
      </span>

      <span className="flex items-center gap-0.5">
        <PageLink
          href={listHref(basePath, params, { page: 1 })}
          isDisabled={isFirst}
          ariaLabel="First page"
        >
          <IconChevronsLeft size={16} stroke={1.75} />
        </PageLink>
        <PageLink
          href={listHref(basePath, params, { page: params.page - 1 })}
          isDisabled={isFirst}
          ariaLabel="Previous page"
        >
          <IconChevronLeft size={16} stroke={1.75} />
        </PageLink>
        <span className="px-2 text-foreground">
          {params.page}
          <span className="text-faint"> / {pages}</span>
        </span>
        <PageLink
          href={listHref(basePath, params, { page: params.page + 1 })}
          isDisabled={isLast}
          ariaLabel="Next page"
        >
          <IconChevronRight size={16} stroke={1.75} />
        </PageLink>
        <PageLink
          href={listHref(basePath, params, { page: pages })}
          isDisabled={isLast}
          ariaLabel="Last page"
        >
          <IconChevronsRight size={16} stroke={1.75} />
        </PageLink>
      </span>

      <span className="flex items-center gap-2">
        Items per page:
        <ListParamSelect
          name="per_page"
          value={String(params.perPage)}
          ariaLabel="Items per page"
          options={PER_PAGE_OPTIONS.map((n) => ({
            value: String(n),
            label: String(n),
          }))}
        />
      </span>
    </div>
  );
}
