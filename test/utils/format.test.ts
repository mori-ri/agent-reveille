import { describe, it, expect } from "vitest";
import { formatDuration } from "../../src/utils/format.js";

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
