import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatAbsoluteTime,
  formatFullTime,
  formatRelativeTime,
} from "../../src/utils/format.js";

describe("formatDuration", () => {
  it("should format seconds", () => {
    expect(formatDuration(5000)).toBe("5s");
    expect(formatDuration(45000)).toBe("45s");
  });

  it("should format minutes and seconds", () => {
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(154000)).toBe("2m 34s");
  });

  it("should format hours and minutes", () => {
    expect(formatDuration(3_660_000)).toBe("1h 1m");
    expect(formatDuration(7_200_000)).toBe("2h 0m");
  });

  it("should handle zero", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});

describe("formatAbsoluteTime", () => {
  it("should format ISO string to YYYY-MM-DD HH:mm", () => {
    // Use a fixed date to avoid timezone issues in tests
    const date = new Date(2026, 3, 4, 9, 3, 0); // April 4, 2026 09:03
    const result = formatAbsoluteTime(date.toISOString());
    expect(result).toBe("2026-04-04 09:03");
  });

  it("should handle midnight", () => {
    const date = new Date(2026, 0, 1, 0, 0, 0); // Jan 1, 2026 00:00
    const result = formatAbsoluteTime(date.toISOString());
    expect(result).toBe("2026-01-01 00:00");
  });

  it("should pad single-digit months and hours", () => {
    const date = new Date(2026, 0, 5, 3, 7, 0); // Jan 5, 2026 03:07
    const result = formatAbsoluteTime(date.toISOString());
    expect(result).toBe("2026-01-05 03:07");
  });
});

describe("formatFullTime", () => {
  it("should return absolute time with relative time in parentheses", () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const result = formatFullTime(twoHoursAgo.toISOString());
    const absolute = formatAbsoluteTime(twoHoursAgo.toISOString());
    // Should start with the absolute time
    expect(result).toContain(absolute);
    // Should contain relative part in parentheses
    expect(result).toMatch(/\(.+ago\)/);
  });

  it("should use formatRelativeTime for the relative part", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatFullTime(fiveMinutesAgo.toISOString());
    const relative = formatRelativeTime(fiveMinutesAgo.toISOString());
    expect(result).toContain(relative);
  });
});
