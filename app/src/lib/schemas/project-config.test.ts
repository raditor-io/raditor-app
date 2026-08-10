import { describe, expect, it } from "vitest";

import {
  parseAllowlistLines,
  pathAllowlistSchema,
  slugify,
  urlMappingConfigSchema,
} from "./project-config";

describe("urlMappingConfigSchema", () => {
  it("accepts ordered repo-relative rules", () => {
    const result = urlMappingConfigSchema.safeParse([
      { pattern: "content/blog/*.mdx", url: "/blog/{slug}" },
      { pattern: "docs/{locale}/**/*.md", url: "/{locale}/docs/{path}" },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects absolute or traversal patterns and non-rooted URLs", () => {
    expect(
      urlMappingConfigSchema.safeParse([{ pattern: "/abs/*.md", url: "/x" }])
        .success,
    ).toBe(false);
    expect(
      urlMappingConfigSchema.safeParse([{ pattern: "../up/*.md", url: "/x" }])
        .success,
    ).toBe(false);
    expect(
      urlMappingConfigSchema.safeParse([{ pattern: "a/*.md", url: "blog" }])
        .success,
    ).toBe(false);
  });
});

describe("pathAllowlistSchema", () => {
  it("accepts repo-relative folders", () => {
    expect(
      pathAllowlistSchema.safeParse(["content/blog", "docs/**"]).success,
    ).toBe(true);
  });

  it("rejects traversal and absolute entries", () => {
    expect(pathAllowlistSchema.safeParse(["../etc"]).success).toBe(false);
    expect(pathAllowlistSchema.safeParse(["/root"]).success).toBe(false);
  });
});

describe("parseAllowlistLines", () => {
  it("splits, trims, and drops empty lines", () => {
    expect(parseAllowlistLines(" content/blog \n\n docs \n")).toEqual([
      "content/blog",
      "docs",
    ]);
  });
});

describe("slugify", () => {
  it("normalizes names", () => {
    expect(slugify("Acme Docs Site!")).toBe("acme-docs-site");
    expect(slugify("---")).toBe("project");
  });
});
