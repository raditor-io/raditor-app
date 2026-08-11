import { describe, expect, it } from "vitest";

import { activeProjectId, buildCrumbs } from "./build-crumbs";

describe("buildCrumbs", () => {
  it("returns no crumbs at the org home (org crumb is the leaf)", () => {
    expect(buildCrumbs("/")).toEqual([]);
  });

  it("maps org-level sections", () => {
    expect(buildCrumbs("/content")).toEqual([
      { label: "Content", href: "/content" },
    ]);
    expect(buildCrumbs("/radar")).toEqual([
      { label: "Radars", href: "/radar" },
    ]);
    expect(buildCrumbs("/editors")).toEqual([
      { label: "Editors", href: "/editors" },
    ]);
  });

  it("maps nested settings routes with a linked parent", () => {
    expect(buildCrumbs("/settings/members")).toEqual([
      { label: "Settings", href: "/settings" },
      { label: "Members" },
    ]);
  });

  it("keeps plain settings a single crumb", () => {
    expect(buildCrumbs("/settings")).toEqual([
      { label: "Settings", href: "/settings" },
    ]);
  });

  it("ignores trailing slashes", () => {
    expect(buildCrumbs("/content/")).toEqual([
      { label: "Content", href: "/content" },
    ]);
  });

  it("returns no crumbs for unknown sections", () => {
    expect(buildCrumbs("/nonexistent")).toEqual([]);
  });

  it("maps project sub-sections without the project crumb itself", () => {
    expect(buildCrumbs("/projects/abc-123")).toEqual([]);
    expect(buildCrumbs("/projects/abc-123/radar")).toEqual([
      { label: "Radars", href: "/projects/abc-123/radar" },
    ]);
    expect(buildCrumbs("/projects/abc-123/settings")).toEqual([
      { label: "Settings", href: "/projects/abc-123/settings" },
    ]);
  });

  it("adds a Suggestion leaf on suggestion detail routes", () => {
    expect(buildCrumbs("/projects/abc-123/content/sugg-1")).toEqual([
      { label: "Content", href: "/projects/abc-123/content" },
      { label: "Suggestion" },
    ]);
  });

  it("adds a leaf on radar detail routes", () => {
    expect(buildCrumbs("/projects/abc-123/radar/radar-1")).toEqual([
      { label: "Radars", href: "/projects/abc-123/radar" },
      { label: "Radar detail" },
    ]);
  });

  it("maps the new-project and new-editor routes", () => {
    expect(buildCrumbs("/projects/new")).toEqual([{ label: "New project" }]);
    expect(buildCrumbs("/editors/new")).toEqual([
      { label: "Editors", href: "/editors" },
      { label: "New editor" },
    ]);
  });
});

describe("activeProjectId", () => {
  it("extracts the project id from project routes", () => {
    expect(activeProjectId("/projects/abc-123/radar")).toBe("abc-123");
    expect(activeProjectId("/projects/abc-123")).toBe("abc-123");
  });

  it("returns null at org level and on /projects/new", () => {
    expect(activeProjectId("/content")).toBeNull();
    expect(activeProjectId("/")).toBeNull();
    expect(activeProjectId("/projects/new")).toBeNull();
  });
});
