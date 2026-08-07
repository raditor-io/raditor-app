import { describe, expect, it } from "vitest";

import { intervalBucket, isoWeek } from "./time-buckets";

describe("intervalBucket", () => {
  const aug7 = new Date(Date.UTC(2026, 7, 7, 15, 30));

  it("formats daily buckets", () => {
    expect(intervalBucket(aug7, "daily")).toBe("2026-08-07");
  });

  it("formats monthly buckets", () => {
    expect(intervalBucket(aug7, "monthly")).toBe("2026-08");
  });

  it("formats weekly buckets with ISO week numbers", () => {
    // 2026-08-07 is a Friday in ISO week 32.
    expect(intervalBucket(aug7, "weekly")).toBe("2026-W32");
  });

  it("uses UTC day boundaries", () => {
    const lateUtc = new Date(Date.UTC(2026, 7, 7, 23, 59, 59));
    const nextUtc = new Date(Date.UTC(2026, 7, 8, 0, 0, 1));
    expect(intervalBucket(lateUtc, "daily")).toBe("2026-08-07");
    expect(intervalBucket(nextUtc, "daily")).toBe("2026-08-08");
  });
});

describe("isoWeek", () => {
  it("assigns early January to the previous ISO year when the week belongs there", () => {
    // 2027-01-01 is a Friday → ISO week 53 of 2026.
    expect(isoWeek(new Date(Date.UTC(2027, 0, 1)))).toEqual({
      year: 2026,
      week: 53,
    });
  });

  it("assigns late December to the next ISO year when the week belongs there", () => {
    // 2024-12-30 is a Monday → ISO week 1 of 2025.
    expect(isoWeek(new Date(Date.UTC(2024, 11, 30)))).toEqual({
      year: 2025,
      week: 1,
    });
  });

  it("handles a mid-year date", () => {
    expect(isoWeek(new Date(Date.UTC(2026, 7, 7)))).toEqual({
      year: 2026,
      week: 32,
    });
  });
});
