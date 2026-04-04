import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseTokenUsage,
  estimateCost,
  type TokenUsage,
  type CostEntry,
  saveCostEntry,
  loadCostEntries,
  getCostSummary,
  type CostSummary,
} from "../../src/lib/costs.js";
import { writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "../../src/lib/paths.js";

const costsPath = join(getConfigDir(), "costs.json");

describe("parseTokenUsage", () => {
  it("should parse Claude Code token output", () => {
    const stdout = `Some output\n> Tokens: 1234 input, 5678 output\nDone.`;
    const usage = parseTokenUsage(stdout, "claude");
    expect(usage).not.toBeNull();
    expect(usage!.inputTokens).toBe(1234);
    expect(usage!.outputTokens).toBe(5678);
  });

  it("should parse token output with commas in numbers", () => {
    const stdout = `> Tokens: 12,345 input, 67,890 output`;
    const usage = parseTokenUsage(stdout, "claude");
    expect(usage).not.toBeNull();
    expect(usage!.inputTokens).toBe(12345);
    expect(usage!.outputTokens).toBe(67890);
  });

  it("should return null when no token info found", () => {
    const usage = parseTokenUsage("just some text", "claude");
    expect(usage).toBeNull();
  });

  it("should parse total cost line", () => {
    const stdout = `> Total cost: $0.42\nTokens: 1000 input, 2000 output`;
    const usage = parseTokenUsage(stdout, "claude");
    expect(usage).not.toBeNull();
    expect(usage!.totalCost).toBe(0.42);
  });

  it("should handle custom agent (return null)", () => {
    const usage = parseTokenUsage("anything", "custom");
    expect(usage).toBeNull();
  });
});

describe("estimateCost", () => {
  it("should estimate cost for claude tokens", () => {
    const usage: TokenUsage = { inputTokens: 1000, outputTokens: 500 };
    const cost = estimateCost(usage, "claude");
    expect(cost).toBeGreaterThan(0);
  });

  it("should use totalCost if already parsed", () => {
    const usage: TokenUsage = { inputTokens: 1000, outputTokens: 500, totalCost: 0.55 };
    const cost = estimateCost(usage, "claude");
    expect(cost).toBe(0.55);
  });

  it("should return 0 for unknown agents", () => {
    const usage: TokenUsage = { inputTokens: 1000, outputTokens: 500 };
    const cost = estimateCost(usage, "custom");
    expect(cost).toBe(0);
  });
});

describe("cost entries persistence", () => {
  beforeEach(() => {
    if (existsSync(costsPath)) writeFileSync(costsPath, "[]", "utf-8");
  });

  afterEach(() => {
    if (existsSync(costsPath)) writeFileSync(costsPath, "[]", "utf-8");
  });

  it("should save and load cost entries", () => {
    const entry: CostEntry = {
      executionId: "e1",
      taskId: "t1",
      timestamp: "2026-04-04T09:00:00Z",
      agent: "claude",
      inputTokens: 1000,
      outputTokens: 500,
      estimatedCost: 0.03,
    };
    saveCostEntry(entry);

    const entries = loadCostEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].executionId).toBe("e1");
  });
});

describe("getCostSummary", () => {
  beforeEach(() => {
    const entries: CostEntry[] = [
      {
        executionId: "e1",
        taskId: "t1",
        timestamp: "2026-04-04T09:00:00Z",
        agent: "claude",
        inputTokens: 1000,
        outputTokens: 500,
        estimatedCost: 0.03,
      },
      {
        executionId: "e2",
        taskId: "t1",
        timestamp: "2026-04-04T10:00:00Z",
        agent: "claude",
        inputTokens: 2000,
        outputTokens: 1000,
        estimatedCost: 0.06,
      },
      {
        executionId: "e3",
        taskId: "t2",
        timestamp: "2026-04-03T09:00:00Z",
        agent: "codex",
        inputTokens: 500,
        outputTokens: 200,
        estimatedCost: 0.01,
      },
    ];
    writeFileSync(costsPath, JSON.stringify(entries), "utf-8");
  });

  afterEach(() => {
    if (existsSync(costsPath)) writeFileSync(costsPath, "[]", "utf-8");
  });

  it("should return total cost across all entries", () => {
    const summary = getCostSummary();
    expect(summary.totalCost).toBeCloseTo(0.10);
    expect(summary.totalInputTokens).toBe(3500);
    expect(summary.totalOutputTokens).toBe(1700);
    expect(summary.entryCount).toBe(3);
  });

  it("should group costs by task", () => {
    const summary = getCostSummary();
    expect(summary.byTask).toHaveLength(2);
    const t1 = summary.byTask.find((t) => t.taskId === "t1");
    expect(t1).toBeDefined();
    expect(t1!.totalCost).toBeCloseTo(0.09);
    expect(t1!.entryCount).toBe(2);
  });

  it("should filter by date range", () => {
    const summary = getCostSummary({
      since: new Date("2026-04-04T00:00:00Z"),
    });
    expect(summary.entryCount).toBe(2);
    expect(summary.totalCost).toBeCloseTo(0.09);
  });
});
