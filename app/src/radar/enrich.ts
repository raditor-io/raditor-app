/**
 * Diff enrichment for target-emitted events: turns fetched changed-file
 * patches into a bounded, prompt-ready text block so scans summarize the
 * actual change instead of trusting the commit message's claim about it.
 *
 * Pure module (no network): fetching lives in github/api.ts, this bounds and
 * formats. Diff content is attacker-writable; callers wrap the result via
 * ai/untrusted before it reaches a prompt.
 */
import type { DiffFile } from "@/github/api";

export const MAX_DIFF_FILES = 20;
export const MAX_TOTAL_PATCH_CHARS = 12_000;
export const MAX_PATCH_CHARS_PER_FILE = 2_000;

/** Generated/lockfile noise that never helps editorial judgment. */
const SKIPPED_FILENAME_PATTERNS = [
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /\.lock$/,
  /(^|\/)dist\//,
  /\.min\.(js|css)$/,
  /(^|\/)\.next\//,
];

function isSkippedFile(filename: string): boolean {
  return SKIPPED_FILENAME_PATTERNS.some((pattern) => pattern.test(filename));
}

/** Prefix match against the target's path_filters (empty = everything). */
function matchesPathFilters(filename: string, pathFilters: string[]): boolean {
  if (pathFilters.length === 0) return true;
  return pathFilters.some((filter) => filename.startsWith(filter));
}

export interface DiffStat {
  files_changed: number;
  files_shown: number;
  additions: number;
  deletions: number;
}

export interface FormattedDiff {
  /** Prompt-ready block; empty string when nothing relevant survived. */
  text: string;
  stat: DiffStat;
}

export function formatDiffForPrompt(
  files: DiffFile[],
  options: { pathFilters?: string[] } = {},
): FormattedDiff {
  const pathFilters = options.pathFilters ?? [];
  const relevant = files.filter(
    (file) =>
      !isSkippedFile(file.filename) &&
      matchesPathFilters(file.filename, pathFilters),
  );

  const stat: DiffStat = {
    files_changed: files.length,
    files_shown: 0,
    additions: relevant.reduce((sum, f) => sum + f.additions, 0),
    deletions: relevant.reduce((sum, f) => sum + f.deletions, 0),
  };

  const sections: string[] = [];
  let totalChars = 0;

  for (const file of relevant.slice(0, MAX_DIFF_FILES)) {
    const header = `--- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`;
    let section = header;
    if (file.patch) {
      const patch =
        file.patch.length > MAX_PATCH_CHARS_PER_FILE
          ? `${file.patch.slice(0, MAX_PATCH_CHARS_PER_FILE)}\n[patch truncated]`
          : file.patch;
      section = `${header}\n${patch}`;
    }
    if (totalChars + section.length > MAX_TOTAL_PATCH_CHARS) {
      sections.push("[remaining files omitted for size]");
      break;
    }
    sections.push(section);
    totalChars += section.length;
    stat.files_shown += 1;
  }

  if (relevant.length > MAX_DIFF_FILES && !sections.includes("[remaining files omitted for size]")) {
    sections.push(`[${relevant.length - MAX_DIFF_FILES} more files omitted]`);
  }

  return {
    text: stat.files_shown > 0 ? sections.join("\n\n") : "",
    stat,
  };
}
