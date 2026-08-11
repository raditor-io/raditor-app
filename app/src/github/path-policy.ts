/**
 * Path allowlist chokepoint: Raditor may only ever write inside a project's
 * deploy_path_allowlist. Enforced twice, defense in depth — at draft render
 * and again at PR open. GitHub cannot path-scope write permissions, so this
 * policy layer is the enforcement (PROJECT.md §5.8).
 *
 * Allowlist entries are repo-relative folders or simple globs:
 *   "content/blog"      -> everything under content/blog/
 *   "docs/**" / "docs/*" -> treated the same as "docs"
 */

function normalizeEntry(entry: string): string {
  return entry
    .replace(/\/\*\*?$/, "") // trailing /* or /** means the folder itself
    .replace(/\/+$/, "")
    .trim();
}

export function isPathAllowed(filePath: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return false;
  if (
    filePath.length === 0 ||
    filePath.startsWith("/") ||
    filePath.includes("\\") ||
    filePath.includes("..") ||
    filePath.includes("\0")
  ) {
    return false;
  }

  return allowlist.some((entry) => {
    const normalized = normalizeEntry(entry);
    if (normalized.length === 0) return false;
    return filePath === normalized || filePath.startsWith(`${normalized}/`);
  });
}

/** Throws with a clear message when any path escapes the allowlist. */
export function assertPathsAllowed(
  filePaths: string[],
  allowlist: string[],
): void {
  if (allowlist.length === 0) {
    throw new Error(
      "The project has no deploy path allowlist configured; Raditor writes nothing until one is set (project settings, Deploy target).",
    );
  }
  const violations = filePaths.filter((p) => !isPathAllowed(p, allowlist));
  if (violations.length > 0) {
    throw new Error(
      `Path allowlist violation: ${violations.join(", ")} outside [${allowlist.join(", ")}]`,
    );
  }
}
