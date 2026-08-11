import { describe, expect, it } from "vitest";

import type { DiffFile } from "@/github/api";

import {
  formatDiffForPrompt,
  MAX_DIFF_FILES,
  MAX_PATCH_CHARS_PER_FILE,
} from "./enrich";

function file(overrides: Partial<DiffFile> = {}): DiffFile {
  return {
    filename: "src/page.tsx",
    status: "modified",
    additions: 5,
    deletions: 2,
    patch: "@@ -1,3 +1,3 @@\n-old line\n+new line",
    ...overrides,
  };
}

describe("formatDiffForPrompt", () => {
  it("formats file headers with stats and patches", () => {
    const result = formatDiffForPrompt([file()]);
    expect(result.text).toContain("--- src/page.tsx (modified, +5/-2)");
    expect(result.text).toContain("+new line");
    expect(result.stat).toMatchObject({
      files_changed: 1,
      files_shown: 1,
      additions: 5,
      deletions: 2,
    });
  });

  it("skips lockfiles and generated noise", () => {
    const result = formatDiffForPrompt([
      file({ filename: "pnpm-lock.yaml" }),
      file({ filename: "app/pnpm-lock.yaml" }),
      file({ filename: "dist/bundle.js" }),
      file({ filename: "styles.min.css" }),
      file({ filename: "src/real-change.ts" }),
    ]);
    expect(result.stat.files_shown).toBe(1);
    expect(result.text).toContain("src/real-change.ts");
    expect(result.text).not.toContain("pnpm-lock");
  });

  it("applies path filters as prefixes when configured", () => {
    const result = formatDiffForPrompt(
      [
        file({ filename: "landing/src/hero.tsx" }),
        file({ filename: "docs/api.md" }),
      ],
      { pathFilters: ["landing/"] },
    );
    expect(result.stat.files_shown).toBe(1);
    expect(result.text).toContain("landing/src/hero.tsx");
    expect(result.text).not.toContain("docs/api.md");
  });

  it("handles binary files (no patch) with header only", () => {
    const result = formatDiffForPrompt([
      file({ filename: "logo.png", patch: undefined }),
    ]);
    expect(result.text).toContain("--- logo.png");
    expect(result.stat.files_shown).toBe(1);
  });

  it("truncates oversized per-file patches", () => {
    const result = formatDiffForPrompt([
      file({ patch: "x".repeat(MAX_PATCH_CHARS_PER_FILE + 500) }),
    ]);
    expect(result.text).toContain("[patch truncated]");
  });

  it("caps the number of files and notes omissions", () => {
    const many = Array.from({ length: MAX_DIFF_FILES + 5 }, (_, i) =>
      file({ filename: `src/file-${i}.ts`, patch: "small" }),
    );
    const result = formatDiffForPrompt(many);
    expect(result.stat.files_shown).toBe(MAX_DIFF_FILES);
    expect(result.text).toContain("more files omitted");
  });

  it("returns empty text when nothing relevant survives", () => {
    const result = formatDiffForPrompt([file({ filename: "yarn.lock" })]);
    expect(result.text).toBe("");
    expect(result.stat.files_shown).toBe(0);
  });
});
