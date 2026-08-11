import { describe, expect, it } from "vitest";

import { assertPathsAllowed, isPathAllowed } from "./path-policy";

const ALLOWLIST = ["content/blog", "docs/updates"];

describe("isPathAllowed", () => {
  it("allows files inside allowlisted folders", () => {
    expect(isPathAllowed("content/blog/post.mdx", ALLOWLIST)).toBe(true);
    expect(isPathAllowed("docs/updates/v2.md", ALLOWLIST)).toBe(true);
    expect(isPathAllowed("docs/updates/deep/nested.md", ALLOWLIST)).toBe(true);
  });

  it("allows the exact folder path itself", () => {
    expect(isPathAllowed("content/blog", ALLOWLIST)).toBe(true);
  });

  it("rejects files outside the allowlist", () => {
    expect(isPathAllowed("src/index.ts", ALLOWLIST)).toBe(false);
    expect(isPathAllowed("docs/other/file.md", ALLOWLIST)).toBe(false);
    expect(isPathAllowed("README.md", ALLOWLIST)).toBe(false);
  });

  it("rejects prefix-collision escapes", () => {
    expect(isPathAllowed("content/blog-secret/post.md", ALLOWLIST)).toBe(false);
    expect(isPathAllowed("content/blogx", ALLOWLIST)).toBe(false);
  });

  it("rejects traversal, absolute, and malformed paths", () => {
    expect(isPathAllowed("content/blog/../../secrets.env", ALLOWLIST)).toBe(false);
    expect(isPathAllowed("/etc/passwd", ALLOWLIST)).toBe(false);
    expect(isPathAllowed("content\\blog\\x.md", ALLOWLIST)).toBe(false);
    expect(isPathAllowed("", ALLOWLIST)).toBe(false);
  });

  it("treats glob suffixes as the folder itself", () => {
    expect(isPathAllowed("docs/a.md", ["docs/**"])).toBe(true);
    expect(isPathAllowed("docs/a.md", ["docs/*"])).toBe(true);
    expect(isPathAllowed("other/a.md", ["docs/**"])).toBe(false);
  });

  it("rejects everything on an empty allowlist", () => {
    expect(isPathAllowed("anything.md", [])).toBe(false);
  });
});

describe("assertPathsAllowed", () => {
  it("passes for compliant paths", () => {
    expect(() =>
      assertPathsAllowed(["content/blog/a.mdx"], ALLOWLIST),
    ).not.toThrow();
  });

  it("throws with the violating paths listed", () => {
    expect(() =>
      assertPathsAllowed(["content/blog/a.mdx", "src/hack.ts"], ALLOWLIST),
    ).toThrow(/src\/hack\.ts/);
  });

  it("throws a configuration error on an empty allowlist", () => {
    expect(() => assertPathsAllowed(["content/blog/a.mdx"], [])).toThrow(
      /no deploy path allowlist/,
    );
  });
});
