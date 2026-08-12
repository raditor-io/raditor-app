import { describe, expect, it } from "vitest";

import {
  DEFAULT_PER_PAGE,
  listHref,
  pageRange,
  parseListParams,
} from "./list-params";

describe("parseListParams", () => {
  it("defaults to empty search, page 1, default per_page", () => {
    expect(parseListParams({})).toEqual({
      q: "",
      kind: "",
      page: 1,
      perPage: DEFAULT_PER_PAGE,
    });
  });

  it("reads valid values and trims the query", () => {
    expect(
      parseListParams({ q: "  release ", kind: "price_changed", page: "3", per_page: "50" }),
    ).toEqual({ q: "release", kind: "price_changed", page: 3, perPage: 50 });
  });

  it("rejects garbage pages and non-listed per_page values", () => {
    expect(parseListParams({ page: "0" }).page).toBe(1);
    expect(parseListParams({ page: "abc" }).page).toBe(1);
    expect(parseListParams({ per_page: "999" }).perPage).toBe(DEFAULT_PER_PAGE);
  });

  it("takes the first value of repeated params", () => {
    expect(parseListParams({ q: ["a", "b"] }).q).toBe("a");
  });
});

describe("pageRange", () => {
  it("computes zero-based inclusive ranges", () => {
    expect(pageRange({ q: "", kind: "", page: 1, perPage: 20 })).toEqual({
      from: 0,
      to: 19,
    });
    expect(pageRange({ q: "", kind: "", page: 3, perPage: 10 })).toEqual({
      from: 20,
      to: 29,
    });
  });
});

describe("listHref", () => {
  const params = { q: "x", kind: "", page: 2, perPage: 20 };

  it("serializes only non-default params", () => {
    expect(listHref("/radars", params)).toBe("/radars?q=x&page=2");
    expect(listHref("/radars", { q: "", kind: "", page: 1, perPage: 20 })).toBe(
      "/radars",
    );
  });

  it("applies patches", () => {
    expect(listHref("/radars", params, { page: 1 })).toBe("/radars?q=x");
    expect(listHref("/radars", params, { perPage: 50, page: 1 })).toBe(
      "/radars?q=x&per_page=50",
    );
  });
});
