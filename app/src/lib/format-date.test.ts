import { describe, expect, it } from "vitest";

import {
  DEFAULT_DATE_TIME_SETTINGS,
  dateTimeSettingsOf,
  formatDate,
  formatDateTime,
  formatTime,
  isValidTimezone,
  type DateTimeSettings,
} from "./format-date";

// 24 Jun 2026, 14:30 UTC — afternoon in Europe, morning in the US.
const INSTANT = "2026-06-24T14:30:00Z";

/** ICU joins 12h times with U+202F/U+00A0 before AM/PM; normalize for asserts. */
const norm = (s: string): string => s.replace(/[  ]/g, " ");

const settings = (overrides: Partial<DateTimeSettings>): DateTimeSettings => ({
  ...DEFAULT_DATE_TIME_SETTINGS,
  ...overrides,
});

describe("formatDateTime", () => {
  it("renders the default settings (mdy_slash, 12h, UTC)", () => {
    expect(norm(formatDateTime(INSTANT, DEFAULT_DATE_TIME_SETTINGS))).toBe(
      "06/24/2026, 02:30 PM",
    );
  });

  it("renders dmy_dot with 24h in Europe/Berlin (UTC+2 in June)", () => {
    expect(
      formatDateTime(
        INSTANT,
        settings({
          timezone: "Europe/Berlin",
          dateFormat: "dmy_dot",
          timeFormat: "24h",
        }),
      ),
    ).toBe("24.06.2026, 16:30");
  });

  it("shifts across the date line for negative offsets", () => {
    expect(
      formatDateTime(
        "2026-06-24T02:30:00Z",
        settings({
          timezone: "America/New_York",
          dateFormat: "ymd_dash",
          timeFormat: "24h",
        }),
      ),
    ).toBe("2026-06-23, 22:30");
  });

  it("renders the long style", () => {
    expect(
      norm(formatDateTime(INSTANT, settings({ dateFormat: "long" }))),
    ).toBe("June 24, 2026, 02:30 PM");
  });

  it("drops the time entirely for timeFormat none", () => {
    expect(formatDateTime(INSTANT, settings({ timeFormat: "none" }))).toBe(
      "06/24/2026",
    );
  });

  it("renders 24h midnight as 00, not 24", () => {
    expect(
      formatDateTime(
        "2026-01-02T00:15:00Z",
        settings({ dateFormat: "ymd_dash", timeFormat: "24h" }),
      ),
    ).toBe("2026-01-02, 00:15");
  });

  it("returns empty string for invalid or missing input", () => {
    expect(formatDateTime(null, DEFAULT_DATE_TIME_SETTINGS)).toBe("");
    expect(formatDateTime("not a date", DEFAULT_DATE_TIME_SETTINGS)).toBe("");
  });

  it("accepts epoch milliseconds", () => {
    const millis = new Date(INSTANT).getTime();
    expect(
      formatDateTime(
        millis,
        settings({ dateFormat: "ymd_dash", timeFormat: "24h" }),
      ),
    ).toBe("2026-06-24, 14:30");
  });
});

describe("formatDate / formatTime", () => {
  it("formats each explicit date pattern locale-independently", () => {
    expect(formatDate(INSTANT, settings({ dateFormat: "mdy_slash" }))).toBe(
      "06/24/2026",
    );
    expect(formatDate(INSTANT, settings({ dateFormat: "dmy_slash" }))).toBe(
      "24/06/2026",
    );
    expect(formatDate(INSTANT, settings({ dateFormat: "dmy_dot" }))).toBe(
      "24.06.2026",
    );
    expect(formatDate(INSTANT, settings({ dateFormat: "ymd_dash" }))).toBe(
      "2026-06-24",
    );
  });

  it("formats the time alone in both clocks", () => {
    expect(norm(formatTime(INSTANT, settings({ timeFormat: "12h" })))).toBe(
      "02:30 PM",
    );
    expect(formatTime(INSTANT, settings({ timeFormat: "24h" }))).toBe("14:30");
    expect(formatTime(INSTANT, settings({ timeFormat: "none" }))).toBe("");
  });
});

describe("dateTimeSettingsOf", () => {
  it("passes valid stored values through", () => {
    expect(
      dateTimeSettingsOf({
        timezone: "Europe/Berlin",
        date_format: "dmy_dot",
        time_format: "24h",
      }),
    ).toEqual({
      timezone: "Europe/Berlin",
      dateFormat: "dmy_dot",
      timeFormat: "24h",
    });
  });

  it("falls back per field on unknown stored values", () => {
    expect(
      dateTimeSettingsOf({
        timezone: "Mars/Olympus_Mons",
        date_format: "dmy_dot",
        time_format: "13h",
      }),
    ).toEqual({
      timezone: "UTC",
      dateFormat: "dmy_dot",
      timeFormat: "12h",
    });
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA ids and UTC, rejects garbage", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Europe/Berlin")).toBe(true);
    expect(isValidTimezone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
});
