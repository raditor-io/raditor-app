/**
 * Standard list-view URL params: ?q= (search), ?kind= (filter), ?page=,
 * ?per_page=. Pure so pages and tests share one parser.
 */

export const PER_PAGE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PER_PAGE = 20;

export interface ListParams {
  q: string;
  kind: string;
  page: number;
  perPage: number;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseListParams(searchParams: RawSearchParams): ListParams {
  const q = first(searchParams.q).trim().slice(0, 200);
  const kind = first(searchParams.kind).trim().slice(0, 60);

  const rawPage = Number(first(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawPerPage = Number(first(searchParams.per_page));
  const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(rawPerPage)
    ? rawPerPage
    : DEFAULT_PER_PAGE;

  return { q, kind, page, perPage };
}

/** Zero-based Supabase range for the current page. */
export function pageRange(params: ListParams): { from: number; to: number } {
  const from = (params.page - 1) * params.perPage;
  return { from, to: from + params.perPage - 1 };
}

/** Href for the same list with some params changed (page resets on q/kind/per_page changes are the caller's concern). */
export function listHref(
  basePath: string,
  params: ListParams,
  patch: Partial<ListParams> = {},
): string {
  const next = { ...params, ...patch };
  const query = new URLSearchParams();
  if (next.q) query.set("q", next.q);
  if (next.kind) query.set("kind", next.kind);
  if (next.page > 1) query.set("page", String(next.page));
  if (next.perPage !== DEFAULT_PER_PAGE) query.set("per_page", String(next.perPage));
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
