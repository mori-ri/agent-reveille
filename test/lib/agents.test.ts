import { describe, it, expect } from "vitest";
import { buildCommand, getAvailableModels, AGENTS } from "../../src/lib/agents.js";

describe("buildCommand", () => {
  it("should build claude command without model", () => {
    const cmd = buildCommand("claude", "fix the bug");
    expect(cmd).toBe(`claude -p "fix the bug" --dangerously-skip-permissions`);
  });

  it("should build claude command with model", () => {
    const cmd = buildCommand("claude", "fix the bug", undefined, "opus");
    expect(cmd).toBe(`claude -p "fix the bug" --dangerously-skip-permissions --model opus`);
  });

  it("should build gemini command with model", () => {
    const cmd = buildCommand("gemini", "refactor code", undefined, "gemini-2.5-pro");
    expect(cmd).toBe(`gemini -p "refactor code" --model gemini-2.5-pro`);
  });

  it("should build aider command with model", () => {
    const cmd = buildCommand("aider", "add tests", undefined, "gpt-4o");
    expect(cmd).toBe(`aider --message "add tests" --model gpt-4o`);
  });

  it("should build codex command with model", () => {
    const cmd = buildCommand("codex", "write docs", undefined, "o3");
    expect(cmd).toBe(`codex -q "write docs" --model o3`);
  });

  it("should build command without model when model is undefined", () => {
    const cmd = buildCommand("gemini", "test prompt");
    expect(cmd).not.toContain("--model");
  });

  it("should return custom command as-is regardless of model", () => {
    const cmd = buildCommand("custom", "echo hello", "echo hello", "some-model");
    expect(cmd).toBe("echo hello");
  });
});

describe("getAvailableModels", () => {
  it("should return suggested models for claude", () => {
    const models = getAvailableModels("claude");
    expect(models).toContain("sonnet");
    expect(models).toContain("opus");
    expect(models.length).toBeGreaterThan(0);
  });

  it("should return suggested models for gemini", () => {
    const models = getAvailableModels("gemini");
    expect(models.length).toBeGreaterThan(0);
  });

  it("should return suggested models for aider", () => {
    const models = getAvailableModels("aider");
    expect(models.length).toBeGreaterThan(0);
  });

  it("should return suggested models for codex", () => {
    const models = getAvailableModels("codex");
    expect(models.length).toBeGreaterThan(0);
  });

  it("should return empty array for custom", () => {
    const models = getAvailableModels("custom");
    expect(models).toEqual([]);
  });
});

describe("AGENTS modelFlag", () => {
  it("claude has --model flag", () => {
    expect(AGENTS.claude.modelFlag).toBe("--model");
  });

  it("gemini has --model flag", () => {
    expect(AGENTS.gemini.modelFlag).toBe("--model");
  });

  it("aider has --model flag", () => {
    expect(AGENTS.aider.modelFlag).toBe("--model");
  });

  it("codex has --model flag", () => {
    expect(AGENTS.codex.modelFlag).toBe("--model");
  });
});
