import { describe, expect, it } from "vitest";
import { cronToCalendarIntervals, cronToIntervalSeconds } from "../../src/lib/scheduler.js";

describe("cronToCalendarIntervals", () => {
  it("should parse daily at 9:03", () => {
    const result = cronToCalendarIntervals("3 9 * * *");
    expect(result).toEqual([{ Minute: 3, Hour: 9 }]);
  });

  it("should parse every Monday at midnight", () => {
    const result = cronToCalendarIntervals("0 0 * * 1");
    expect(result).toEqual([{ Minute: 0, Hour: 0, Weekday: 1 }]);
  });

  it("should parse specific day and month", () => {
    const result = cronToCalendarIntervals("30 14 15 6 *");
    expect(result).toEqual([{ Minute: 30, Hour: 14, Day: 15, Month: 6 }]);
  });

  it("should handle all wildcards", () => {
    const result = cronToCalendarIntervals("* * * * *");
    expect(result).toEqual([{}]);
  });

  it("should throw on invalid expression", () => {
    expect(() => cronToCalendarIntervals("invalid")).toThrow();
  });
});

describe("cronToIntervalSeconds", () => {
  it("should parse */5 * * * * as 300 seconds", () => {
    expect(cronToIntervalSeconds("*/5 * * * *")).toBe(300);
  });

  it("should parse */30 * * * * as 1800 seconds", () => {
    expect(cronToIntervalSeconds("*/30 * * * *")).toBe(1800);
  });

  it("should return null for non-interval patterns", () => {
    expect(cronToIntervalSeconds("3 9 * * *")).toBeNull();
  });

  it("should return null for complex patterns", () => {
    expect(cronToIntervalSeconds("*/5 9 * * *")).toBeNull();
  });
});
