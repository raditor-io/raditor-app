import { describe, expect, it } from "vitest";

import {
  buildPullPage,
  DEFAULT_PULL_LIMIT,
  MAX_PULL_LIMIT,
  parsePullQuery,
} from "./pull-query";

function params(query: string): URLSearchParams {
  return new URL(`https://x.test/?${query}`).searchParams;
}

describe("parsePullQuery", () => {
  it("defaults after to the subscription cursor and limit to the default", () => {
    const parsed = parsePullQuery(params(""), 17);
    expect(parsed).toEqual({ afterFeedItemId: 17, limit: DEFAULT_PULL_LIMIT });
  });

  it("accepts explicit after and limit", () => {
    expect(parsePullQuery(params("after=100&limit=10"), 17)).toEqual({
      afterFeedItemId: 100,
      limit: 10,
    });
  });

  it("clamps limit into [1, MAX]", () => {
    expect(parsePullQuery(params("limit=0"), 0).limit).toBe(1);
    expect(parsePullQuery(params("limit=99999"), 0).limit).toBe(MAX_PULL_LIMIT);
  });

  it("ignores garbage values", () => {
    const parsed = parsePullQuery(params("after=abc&limit=-x"), 5);
    expect(parsed).toEqual({ afterFeedItemId: 5, limit: DEFAULT_PULL_LIMIT });
  });

  it("allows rewinding to 0", () => {
    expect(parsePullQuery(params("after=0"), 42).afterFeedItemId).toBe(0);
  });
});

describe("buildPullPage", () => {
  const query = { afterFeedItemId: 10, limit: 2 };

  it("slices the sentinel row and reports hasMore", () => {
    const page = buildPullPage(
      [{ id: 11 }, { id: 12 }, { id: 13 }],
      query,
    );
    expect(page.items.map((i) => i.id)).toEqual([11, 12]);
    expect(page.nextCursor).toBe(12);
    expect(page.hasMore).toBe(true);
  });

  it("returns all rows when under the limit", () => {
    const page = buildPullPage([{ id: 11 }], query);
    expect(page.items.map((i) => i.id)).toEqual([11]);
    expect(page.nextCursor).toBe(11);
    expect(page.hasMore).toBe(false);
  });

  it("keeps the incoming cursor on an empty page", () => {
    const page = buildPullPage([], query);
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBe(10);
    expect(page.hasMore).toBe(false);
  });
});
