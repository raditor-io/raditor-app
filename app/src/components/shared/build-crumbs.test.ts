import { describe, expect, it } from "vitest";

import { buildCrumbs } from "./build-crumbs";

describe("buildCrumbs", () => {
  it("maps the dashboard root to Overview", () => {
    expect(buildCrumbs("/")).toEqual([{ label: "Overview" }]);
  });

  it("maps top-level sections", () => {
    expect(buildCrumbs("/websites")).toEqual([
      { label: "Websites", href: "/websites" },
    ]);
    expect(buildCrumbs("/suggestions")).toEqual([
      { label: "Suggestions", href: "/suggestions" },
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
    expect(buildCrumbs("/websites/")).toEqual([
      { label: "Websites", href: "/websites" },
    ]);
  });

  it("returns no crumbs for unknown sections", () => {
    expect(buildCrumbs("/nonexistent")).toEqual([]);
  });
});
