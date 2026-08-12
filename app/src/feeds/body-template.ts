/**
 * Webhook body templates: {{path}} interpolates the value as JSON-escaped
 * text (safe inside JSON string values), {{{path}}} injects the raw JSON
 * encoding (numbers unquoted, arrays/objects expanded) — the Handlebars
 * triple-stash convention, made JSON-aware. Unknown paths render empty.
 */

export interface BodyTemplateContext {
  org: { name: string };
  feed: { id: string; name: string };
  item: { id: number; added_at: string };
  signal: {
    id: string;
    radar_id: string;
    kind: string;
    title: string;
    summary_md: string;
    body_md: string;
    evidence: unknown;
    occurred_at: string;
  };
}

/** Placeholder catalog shown in the template UI; paths resolve on the context. */
export const BODY_TEMPLATE_PLACEHOLDERS: Array<{
  path: string;
  description: string;
}> = [
  { path: "org.name", description: "Organization name" },
  { path: "feed.id", description: "Feed id" },
  { path: "feed.name", description: "Feed name" },
  { path: "item.id", description: "Feed item id (the cursor)" },
  { path: "item.added_at", description: "When the item entered the feed" },
  { path: "signal.id", description: "Signal id" },
  { path: "signal.radar_id", description: "Radar id" },
  { path: "signal.kind", description: "Signal kind slug" },
  { path: "signal.title", description: "Signal title" },
  { path: "signal.summary_md", description: "Signal summary (markdown)" },
  { path: "signal.body_md", description: "Signal briefing (markdown)" },
  { path: "signal.evidence", description: "Evidence entries (JSON array)" },
  { path: "signal.occurred_at", description: "When the development happened" },
];

function resolvePath(context: BodyTemplateContext, path: string): unknown {
  let current: unknown = context;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Value as JSON-escaped text, WITHOUT surrounding quotes (goes inside "..."). */
function escapedText(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text =
    typeof value === "string" ? value : JSON.stringify(value) ?? "";
  return JSON.stringify(text).slice(1, -1);
}

/** Raw JSON encoding of the value (strings come quoted). */
function rawJson(value: unknown): string {
  if (value === undefined) return "null";
  return JSON.stringify(value) ?? "null";
}

const PLACEHOLDER_PATTERN = /\{\{(\{?)\s*([A-Za-z0-9_.]+)\s*\}\}(\})?/g;

export function renderBodyTemplate(
  template: string,
  context: BodyTemplateContext,
): string {
  return template.replace(
    PLACEHOLDER_PATTERN,
    (match, openBrace: string, path: string, closeBrace: string) => {
      const isRaw = openBrace === "{" && closeBrace === "}";
      // Mismatched brace counts ({{{x}} or {{x}}}) stay literal.
      if ((openBrace === "{") !== (closeBrace === "}")) return match;
      const value = resolvePath(context, path);
      return isRaw ? rawJson(value) : escapedText(value);
    },
  );
}
