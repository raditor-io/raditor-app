import { describe, expect, it } from "vitest";

import { activeRadarId, buildCrumbs } from "./build-crumbs";

describe("buildCrumbs", () => {
  it("returns no crumbs on the org home (feeds view)", () => {
    expect(buildCrumbs("/")).toEqual([]);
  });

  it("maps feed routes", () => {
    expect(buildCrumbs("/feeds/abc")).toEqual([{ label: "Feeds", href: "/" }]);
    expect(buildCrumbs("/feeds/abc/settings")).toEqual([
      { label: "Feeds", href: "/" },
      { label: "Configure" },
    ]);
  });

  it("maps radar tab trails (radar crumb comes from context)", () => {
    expect(buildCrumbs("/radars/abc")).toEqual([]);
    expect(buildCrumbs("/radars/abc/signals")).toEqual([{ label: "Signals" }]);
    expect(buildCrumbs("/radars/abc/settings")).toEqual([
      { label: "Settings" },
    ]);
  });

  it("returns no trail on the radars grid", () => {
    expect(buildCrumbs("/radars")).toEqual([]);
  });

  it("maps settings with the members leaf", () => {
    expect(buildCrumbs("/settings")).toEqual([
      { label: "Settings", href: "/settings" },
    ]);
    expect(buildCrumbs("/settings/members")).toEqual([
      { label: "Settings", href: "/settings" },
      { label: "Members" },
    ]);
  });

  it("ignores trailing slashes and unknown sections", () => {
    expect(buildCrumbs("/settings/")).toEqual([
      { label: "Settings", href: "/settings" },
    ]);
    expect(buildCrumbs("/nope")).toEqual([]);
  });
});

describe("activeRadarId", () => {
  it("extracts the radar id from radar routes", () => {
    expect(activeRadarId("/radars/abc-123")).toBe("abc-123");
    expect(activeRadarId("/radars/abc-123/signals")).toBe("abc-123");
  });

  it("returns null elsewhere", () => {
    expect(activeRadarId("/")).toBeNull();
    expect(activeRadarId("/feeds/x")).toBeNull();
    expect(activeRadarId("/settings")).toBeNull();
  });
});
