/**
 * Pull API query semantics: cursor pagination over feed_items ids. `after`
 * defaults to the subscription's acked cursor, so a bare GET returns
 * everything unacked (at-least-once consumption); the consumer advances the
 * cursor explicitly via the cursor endpoint.
 */

export const DEFAULT_PULL_LIMIT = 50;
export const MAX_PULL_LIMIT = 200;

export interface PullQuery {
  afterFeedItemId: number;
  limit: number;
}

export function parsePullQuery(
  searchParams: URLSearchParams,
  defaultAfterFeedItemId: number,
): PullQuery {
  const rawAfter = searchParams.get("after");
  const parsedAfter = rawAfter === null ? NaN : Number(rawAfter);
  const afterFeedItemId =
    Number.isInteger(parsedAfter) && parsedAfter >= 0
      ? parsedAfter
      : defaultAfterFeedItemId;

  const rawLimit = searchParams.get("limit");
  const parsedLimit = rawLimit === null ? NaN : Number(rawLimit);
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_PULL_LIMIT)
    : DEFAULT_PULL_LIMIT;

  return { afterFeedItemId, limit };
}

export interface PullPage<T> {
  items: T[];
  nextCursor: number;
  hasMore: boolean;
}

/**
 * Build a page from `limit + 1` fetched rows: the extra row only signals
 * hasMore. nextCursor is the last returned item's id (or the incoming
 * cursor when the page is empty).
 */
export function buildPullPage<T extends { id: number }>(
  fetchedRows: T[],
  query: PullQuery,
): PullPage<T> {
  const hasMore = fetchedRows.length > query.limit;
  const items = hasMore ? fetchedRows.slice(0, query.limit) : fetchedRows;
  const nextCursor =
    items.length > 0 ? items[items.length - 1].id : query.afterFeedItemId;
  return { items, nextCursor, hasMore };
}
