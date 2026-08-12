/**
 * Keyword filters on feed attachments: a signal's visible text (title +
 * summary) must match at least one must-include keyword (empty list = all)
 * and none of the muted keywords. Matching is case-insensitive; single-word
 * keywords match on word boundaries ("ai" does not match "maintain"),
 * multi-word keywords match as phrase substrings.
 */

export const MAX_KEYWORDS_PER_LIST = 20;
export const MAX_KEYWORD_LENGTH = 60;

export interface KeywordFilters {
  mustIncludeKeywords: string[] | null;
  mutedKeywords: string[] | null;
}

/**
 * Parse a comma-separated input into a keyword list: trimmed, case-insensitive
 * deduped, capped in count and per-entry length.
 */
export function parseKeywordList(raw: string): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const part of raw.split(",")) {
    const keyword = part.trim().slice(0, MAX_KEYWORD_LENGTH);
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
    if (keywords.length >= MAX_KEYWORDS_PER_LIST) break;
  }
  return keywords;
}

function matchesKeyword(text: string, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return false;
  if (normalized.includes(" ")) {
    return text.replace(/\s+/g, " ").includes(normalized);
  }
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(text);
}

/** True when the text passes both filter lists (mute wins over must-include). */
export function passesKeywordFilters(
  text: string,
  filters: KeywordFilters,
): boolean {
  const haystack = text.toLowerCase();
  const muted = filters.mutedKeywords ?? [];
  if (muted.some((keyword) => matchesKeyword(haystack, keyword))) return false;
  const mustInclude = filters.mustIncludeKeywords ?? [];
  if (mustInclude.length === 0) return true;
  return mustInclude.some((keyword) => matchesKeyword(haystack, keyword));
}
