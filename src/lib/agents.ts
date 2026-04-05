import { execSync } from "node:child_process";
import type { AgentId } from "./schema.js";

export interface AgentPreset {
  id: AgentId;
  name: string;
  binary: string;
  detectCommand: string;
  promptTemplate: (prompt: string) => string;
  modelFlag: string;
  suggestedModels: string[];
  description: string;
}

export const AGENTS: Record<Exclude<AgentId, "custom">, AgentPreset> = {
  claude: {
    id: "claude",
    name: "Claude Code",
    binary: "claude",
    detectCommand: "claude --version",
    promptTemplate: (prompt) =>
      `claude -p ${JSON.stringify(prompt)} --dangerously-skip-permissions`,
    modelFlag: "--model",
    suggestedModels: ["sonnet", "opus", "claude-sonnet-4-6", "claude-opus-4-6"],
    description: "Anthropic Claude Code CLI",
  },
  codex: {
    id: "codex",
    name: "Codex CLI",
    binary: "codex",
    detectCommand: "codex --version",
    promptTemplate: (prompt) => `codex -q ${JSON.stringify(prompt)}`,
    modelFlag: "--model",
    suggestedModels: ["o3", "o4-mini", "o3-mini"],
    description: "OpenAI Codex CLI",
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    binary: "gemini",
    detectCommand: "gemini --version",
    promptTemplate: (prompt) => `gemini -p ${JSON.stringify(prompt)}`,
    modelFlag: "--model",
    suggestedModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
    description: "Google Gemini CLI",
  },
  aider: {
    id: "aider",
    name: "Aider",
    binary: "aider",
    detectCommand: "aider --version",
    promptTemplate: (prompt) => `aider --message ${JSON.stringify(prompt)}`,
    modelFlag: "--model",
    suggestedModels: ["gpt-4o", "claude-sonnet-4-6", "deepseek/deepseek-chat"],
    description: "AI pair programming in your terminal",
  },
};

export function detectInstalledAgents(): Array<AgentPreset & { installed: boolean }> {
  return Object.values(AGENTS).map((agent) => {
    let installed = false;
    try {
      execSync(`which ${agent.binary}`, { stdio: "ignore" });
      installed = true;
    } catch {
      installed = false;
    }
    return { ...agent, installed };
  });
}

export function getAgent(id: AgentId): AgentPreset | null {
  if (id === "custom") return null;
  return AGENTS[id] ?? null;
}

export function buildCommand(
  agentId: AgentId,
  prompt: string,
  customCommand?: string,
  model?: string,
): string {
  if (agentId === "custom") {
    return customCommand ?? prompt;
  }
  const agent = AGENTS[agentId];
  let cmd = agent.promptTemplate(prompt);
  if (model) {
    cmd += ` ${agent.modelFlag} ${model}`;
  }
  return cmd;
}

export function getAvailableModels(agentId: AgentId): string[] {
  if (agentId === "custom") return [];
  return AGENTS[agentId].suggestedModels;
}
