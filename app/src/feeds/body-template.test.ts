import { describe, expect, it } from "vitest";

import {
  BODY_TEMPLATE_PLACEHOLDERS,
  renderBodyTemplate,
  type BodyTemplateContext,
} from "./body-template";

const CONTEXT: BodyTemplateContext = {
  org: { name: "Hiveport" },
  feed: { id: "feed-1", name: "Pricing watch" },
  item: { id: 42, added_at: "2026-08-12T08:05:00.000Z" },
  signal: {
    id: "sig-1",
    radar_id: "radar-1",
    kind: "price_changed",
    title: 'Acme "Pro" plan\nnow $49',
    summary_md: "Acme raised prices.",
    body_md: "",
    evidence: [{ url: "https://acme.com/pricing" }],
    occurred_at: "2026-08-12T08:00:00.000Z",
  },
};

describe("renderBodyTemplate", () => {
  it("renders a Resend-style JSON template with escaped text", () => {
    const template = `{"from":"Raditor <s@x.io>","to":["me@x.io"],"subject":"{{signal.title}}","text":"{{signal.summary_md}} ({{org.name}})"}`;
    const rendered = renderBodyTemplate(template, CONTEXT);
    // Quotes and the newline in the title must survive as valid JSON.
    const parsed = JSON.parse(rendered) as { subject: string; text: string };
    expect(parsed.subject).toBe('Acme "Pro" plan\nnow $49');
    expect(parsed.text).toBe("Acme raised prices. (Hiveport)");
  });

  it("injects raw JSON values with triple braces", () => {
    const rendered = renderBodyTemplate(
      `{"count":{{{item.id}}},"evidence":{{{signal.evidence}}},"name":{{{feed.name}}}}`,
      CONTEXT,
    );
    const parsed = JSON.parse(rendered) as {
      count: number;
      evidence: unknown[];
      name: string;
    };
    expect(parsed.count).toBe(42);
    expect(parsed.evidence).toEqual([{ url: "https://acme.com/pricing" }]);
    expect(parsed.name).toBe("Pricing watch");
  });

  it("renders unknown paths as empty text / null raw", () => {
    expect(renderBodyTemplate('"{{nope.nothing}}"', CONTEXT)).toBe('""');
    expect(renderBodyTemplate("{{{nope.nothing}}}", CONTEXT)).toBe("null");
  });

  it("tolerates whitespace and leaves mismatched braces literal", () => {
    expect(renderBodyTemplate("{{ org.name }}", CONTEXT)).toBe("Hiveport");
    expect(renderBodyTemplate("{{{org.name}}", CONTEXT)).toBe("{{{org.name}}");
  });

  it("every cataloged placeholder resolves on the context", () => {
    for (const { path } of BODY_TEMPLATE_PLACEHOLDERS) {
      const rendered = renderBodyTemplate(`{{{${path}}}}`, CONTEXT);
      expect(rendered, path).not.toBe("null");
    }
  });
});
