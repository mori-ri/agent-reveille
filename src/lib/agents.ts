import { execSync } from "node:child_process";
import type { AgentId } from "./schema.js";

export interface AgentPreset {
  id: AgentId;
  name: string;
  binary: string;
  detectCommand: string;
  promptTemplate: (prompt: string) => string;
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
    description: "Anthropic Claude Code CLI",
  },
  codex: {
    id: "codex",
    name: "Codex CLI",
    binary: "codex",
    detectCommand: "codex --version",
    promptTemplate: (prompt) => `codex -q ${JSON.stringify(prompt)}`,
    description: "OpenAI Codex CLI",
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    binary: "gemini",
    detectCommand: "gemini --version",
    promptTemplate: (prompt) => `gemini -p ${JSON.stringify(prompt)}`,
    description: "Google Gemini CLI",
  },
  aider: {
    id: "aider",
    name: "Aider",
    binary: "aider",
    detectCommand: "aider --version",
    promptTemplate: (prompt) => `aider --message ${JSON.stringify(prompt)}`,
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

export function buildCommand(agentId: AgentId, prompt: string, customCommand?: string): string {
  if (agentId === "custom") {
    return customCommand ?? prompt;
  }
  const agent = AGENTS[agentId];
  return agent.promptTemplate(prompt);
}

const PROMPT_FLAGS: Record<Exclude<AgentId, "custom">, string> = {
  claude: "-p ",
  codex: "-q ",
  gemini: "-p ",
  aider: "--message ",
};

export function extractPrompt(agentId: AgentId, command: string): string | null {
  if (agentId === "custom") return null;
  const flag = PROMPT_FLAGS[agentId];
  if (!flag) return null;
  const agent = AGENTS[agentId];
  const prefix = `${agent.binary} ${flag}`;
  const idx = command.indexOf(prefix);
  if (idx === -1) return null;
  const rest = command.slice(idx + prefix.length);
  const match = rest.match(/^("(?:[^"\\]|\\.)*")/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}
