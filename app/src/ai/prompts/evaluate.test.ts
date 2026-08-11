import { describe, expect, it } from "vitest";

import {
  buildRelevanceMessages,
  buildSuggestionMessages,
  relevanceResponseSchema,
  suggestionResponseSchema,
} from "./evaluate";

const PROJECT = {
  displayName: "Acme Docs",
  siteType: "documentation",
  purposeMd: "Document the Acme API.",
  doNotWriteMd: "Never mention unreleased features.",
  editorialMemoryMd: "",
  goals: [{ title: "Ship product changes", bodyMd: "Keep docs current." }],
};

const SIGNAL = {
  title: "v2.0 released",
  summaryMd: "Major release with breaking API changes.",
  wrappedEvidence: "<<<UNTRUSTED_x>>>\nrelease body\n<<<END UNTRUSTED_x>>>",
};

describe("buildRelevanceMessages", () => {
  it("includes briefing, policy, and wrapped evidence", () => {
    const messages = buildRelevanceMessages("Persona text", PROJECT, SIGNAL);
    expect(messages[0]!.role).toBe("system");
    expect(messages[0]!.content).toContain("Persona text");
    const user = messages[1]!.content;
    expect(user).toContain("Acme Docs");
    expect(user).toContain("Never mention unreleased features.");
    expect(user).toContain("UNTRUSTED_x");
  });
});

describe("buildSuggestionMessages", () => {
  it("carries the relevance rationale into the drafting prompt", () => {
    const messages = buildSuggestionMessages(
      "P",
      PROJECT,
      SIGNAL,
      "Highly relevant because docs cover the API.",
    );
    expect(messages[1]!.content).toContain("Highly relevant");
  });
});

describe("response schemas", () => {
  it("validates a relevance response", () => {
    expect(
      relevanceResponseSchema.safeParse({
        relevance_score: 80,
        rationale: "clearly user-visible",
      }).success,
    ).toBe(true);
    expect(
      relevanceResponseSchema.safeParse({ relevance_score: 180, rationale: "" })
        .success,
    ).toBe(false);
  });

  it("validates a four-part suggestion with graph impact", () => {
    const result = suggestionResponseSchema.safeParse({
      title: "Update API docs for v2",
      signal_summary_md: "v2.0 shipped with breaking changes.",
      recommendation_md: "Update the authentication guide.",
      reason_md: "Docs are the project's purpose.",
      graph_impact: {
        operations: [
          {
            op: "update_page",
            file_path: "docs/auth.md",
            summary_of_change: "New token flow",
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown graph operations", () => {
    const result = suggestionResponseSchema.safeParse({
      title: "t",
      signal_summary_md: "s",
      recommendation_md: "r",
      reason_md: "w",
      graph_impact: { operations: [{ op: "delete_everything" }] },
    });
    expect(result.success).toBe(false);
  });
});
