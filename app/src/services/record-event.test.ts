import { describe, expect, it } from "vitest";

import { buildEventRow } from "./record-event";

describe("buildEventRow", () => {
  it("maps camelCase input to snake_case columns", () => {
    const row = buildEventRow({
      organizationId: "org-1",
      eventType: "project_created",
      subjectType: "project",
      subjectId: "site-1",
      actorKind: "user",
      actorId: "user-1",
      payload: { slug: "docs" },
    });
    expect(row).toEqual({
      organization_id: "org-1",
      event_type: "project_created",
      subject_type: "project",
      subject_id: "site-1",
      actor_kind: "user",
      actor_id: "user-1",
      payload: { slug: "docs" },
    });
  });

  it("defaults optional fields to system actor and empty payload", () => {
    const row = buildEventRow({
      organizationId: "org-1",
      eventType: "radar_tick",
    });
    expect(row.actor_kind).toBe("system");
    expect(row.subject_type).toBeNull();
    expect(row.subject_id).toBeNull();
    expect(row.actor_id).toBeNull();
    expect(row.payload).toEqual({});
  });
});
