import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "./paths.js";
import type { AgentId } from "./schema.js";

// --- Types ---

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalCost?: number;
}

export interface CostEntry {
  executionId: string;
  taskId: string;
  timestamp: string;
  agent: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface TaskCostSummary {
  taskId: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  entryCount: number;
}

export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  entryCount: number;
  byTask: TaskCostSummary[];
}

// --- Approximate pricing per 1M tokens (USD) ---

const PRICING: Record<string, { input: number; output: number }> = {
  claude: { input: 3.0, output: 15.0 },
  codex: { input: 2.5, output: 10.0 },
  gemini: { input: 1.25, output: 5.0 },
  aider: { input: 3.0, output: 15.0 }, // Uses Claude/GPT underneath
};

// --- Token parsing ---

export function parseTokenUsage(stdout: string, agent: AgentId): TokenUsage | null {
  if (agent === "custom") return null;

  let inputTokens = 0;
  let outputTokens = 0;
  let totalCost: number | undefined;

  // Parse "Tokens: N input, N output" pattern (Claude Code format)
  const tokenMatch = stdout.match(/Tokens:\s*([\d,]+)\s*input,\s*([\d,]+)\s*output/i);
  if (tokenMatch) {
    inputTokens = parseInt(tokenMatch[1].replace(/,/g, ""), 10);
    outputTokens = parseInt(tokenMatch[2].replace(/,/g, ""), 10);
  }

  // Parse "Total cost: $N.NN" pattern
  const costMatch = stdout.match(/Total cost:\s*\$([\d.]+)/i);
  if (costMatch) {
    totalCost = parseFloat(costMatch[1]);
  }

  if (inputTokens === 0 && outputTokens === 0 && totalCost === undefined) {
    return null;
  }

  return { inputTokens, outputTokens, totalCost };
}

// --- Cost estimation ---

export function estimateCost(usage: TokenUsage, agent: AgentId): number {
  if (usage.totalCost !== undefined) return usage.totalCost;

  const pricing = PRICING[agent];
  if (!pricing) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// --- Persistence ---

function getCostsFilePath(): string {
  return join(getConfigDir(), "costs.json");
}

export function loadCostEntries(): CostEntry[] {
  const path = getCostsFilePath();
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as CostEntry[];
  } catch {
    return [];
  }
}

function saveCostEntries(entries: CostEntry[]): void {
  writeFileSync(getCostsFilePath(), JSON.stringify(entries, null, 2), "utf-8");
}

export function saveCostEntry(entry: CostEntry): void {
  const entries = loadCostEntries();
  entries.push(entry);
  saveCostEntries(entries);
}

// --- Summary ---

export interface CostSummaryOptions {
  since?: Date;
  taskId?: string;
}

export function getCostSummary(options: CostSummaryOptions = {}): CostSummary {
  let entries = loadCostEntries();

  if (options.since) {
    const sinceMs = options.since.getTime();
    entries = entries.filter((e) => new Date(e.timestamp).getTime() >= sinceMs);
  }

  if (options.taskId) {
    entries = entries.filter((e) => e.taskId === options.taskId);
  }

  const byTaskMap = new Map<string, TaskCostSummary>();

  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const entry of entries) {
    totalCost += entry.estimatedCost;
    totalInputTokens += entry.inputTokens;
    totalOutputTokens += entry.outputTokens;

    const existing = byTaskMap.get(entry.taskId);
    if (existing) {
      existing.totalCost += entry.estimatedCost;
      existing.totalInputTokens += entry.inputTokens;
      existing.totalOutputTokens += entry.outputTokens;
      existing.entryCount += 1;
    } else {
      byTaskMap.set(entry.taskId, {
        taskId: entry.taskId,
        totalCost: entry.estimatedCost,
        totalInputTokens: entry.inputTokens,
        totalOutputTokens: entry.outputTokens,
        entryCount: 1,
      });
    }
  }

  return {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    entryCount: entries.length,
    byTask: [...byTaskMap.values()],
  };
}
