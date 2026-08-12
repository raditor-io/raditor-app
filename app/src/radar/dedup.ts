/**
 * Signal identity: dedup keys name the underlying fact so a re-sighting
 * updates the existing signal instead of creating a twin. Repo-target
 * outputs key on (repo, kind, external ref); briefing findings key on their
 * normalized primary evidence URL.
 */

const TRACKING_PARAM_PATTERN = /^(utm_|fbclid$|gclid$|ref$|ref_src$)/;

/**
 * Normalize an evidence URL into a stable identity: lowercase scheme/host,
 * strip `www.`, default ports, fragments, tracking params, and the trailing
 * slash. Returns null for anything that is not http(s).
 */
export function normalizeEvidenceUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const params = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAM_PATTERN.test(key.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length
    ? `?${params.map(([k, v]) => `${k}=${v}`).join("&")}`
    : "";
  const path = url.pathname.replace(/\/+$/, "") || "";

  return `https://${host}${path}${query}`;
}

export interface DedupKeySource {
  outputKind: string;
  externalRef: string;
  /** Repo full name when the output came from a github_repo target. */
  repoFullName?: string | null;
  /** Primary evidence URL for briefing findings. */
  url?: string | null;
}

/** Stable identity of the fact behind one scan output. */
export function deriveDedupKey(source: DedupKeySource): string {
  if (source.repoFullName) {
    return `${source.repoFullName}:${source.outputKind}:${source.externalRef}`;
  }
  const normalized = source.url ? normalizeEvidenceUrl(source.url) : null;
  if (normalized) {
    return `briefing:${normalized}`;
  }
  return `url:${source.externalRef}`;
}
