import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import {
  loadNotifyConfig,
  saveNotifyConfig,
  isValidWebhookUrl,
  type NotifyConfig,
  type NotifyProvider,
} from "../lib/notify.js";

type WebhookProvider = "slack" | "discord";

type SettingsMode =
  | { kind: "view" }
  | { kind: "edit"; provider: WebhookProvider; value: string }
  | { kind: "confirm-remove"; provider: NotifyProvider };

const PROVIDERS: { id: NotifyProvider; label: string }[] = [
  { id: "slack", label: "Slack" },
  { id: "discord", label: "Discord" },
  { id: "macos", label: "macOS" },
];

function providerLabel(id: NotifyProvider): string {
  return PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

function truncateUrl(url: string, maxLength = 40): string {
  return url.length > maxLength ? url.slice(0, maxLength) + "..." : url;
}

function providerStatus(config: NotifyConfig, id: NotifyProvider): { configured: boolean; detail: string } {
  if (id === "macos") {
    return config.macos?.enabled
      ? { configured: true, detail: "enabled" }
      : { configured: false, detail: "disabled" };
  }
  const url = config[id]?.webhookUrl;
  return url
    ? { configured: true, detail: truncateUrl(url) }
    : { configured: false, detail: "not configured" };
}

interface NotifySettingsProps {
  onBack: () => void;
}

export function NotifySettings({ onBack }: NotifySettingsProps) {
  const [config, setConfig] = useState<NotifyConfig>(loadNotifyConfig());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<SettingsMode>({ kind: "view" });
  const [message, setMessage] = useState("");

  function save(newConfig: NotifyConfig): void {
    saveNotifyConfig(newConfig);
    setConfig(newConfig);
  }

  useInput((input, key) => {
    // Edit mode: only handle Escape
    if (mode.kind === "edit") {
      if (key.escape) {
        setMode({ kind: "view" });
        setMessage("");
      }
      return;
    }

    // Confirm-remove mode
    if (mode.kind === "confirm-remove") {
      if (input === "y") {
        const updated = { ...config };
        delete updated[mode.provider];
        save(updated);
        setMessage(`Removed: ${mode.provider}`);
      } else {
        setMessage("Cancelled.");
      }
      setMode({ kind: "view" });
      return;
    }

    // View mode
    if (message) setMessage("");

    if (key.escape || input === "q") {
      onBack();
      return;
    }

    if (input === "j" || key.downArrow) {
      setSelectedIndex((i) => Math.min(i + 1, PROVIDERS.length - 1));
    }
    if (input === "k" || key.upArrow) {
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }

    const provider = PROVIDERS[selectedIndex];

    // Space: toggle macOS
    if (input === " " && provider.id === "macos") {
      const enabled = !config.macos?.enabled;
      save({ ...config, macos: { enabled } });
      setMessage(`macOS notifications ${enabled ? "enabled" : "disabled"}`);
    }

    // e: edit webhook URL (Slack/Discord only)
    if (input === "e" && (provider.id === "slack" || provider.id === "discord")) {
      const current = config[provider.id]?.webhookUrl ?? "";
      setMode({ kind: "edit", provider: provider.id, value: current });
      setMessage("");
    }

    // x: remove provider config
    if (input === "x") {
      const status = providerStatus(config, provider.id);
      if (status.configured) {
        setMode({ kind: "confirm-remove", provider: provider.id });
        setMessage(`Remove ${provider.label}? (y/n)`);
      }
    }
  });

  function handleSubmitUrl(value: string): void {
    if (mode.kind !== "edit") return;
    const trimmed = value.trim();
    if (!trimmed) {
      setMode({ kind: "view" });
      return;
    }
    if (!isValidWebhookUrl(trimmed)) {
      setMessage("Error: must be a valid HTTPS URL");
      return;
    }
    save({ ...config, [mode.provider]: { webhookUrl: trimmed } });
    setMessage(`${providerLabel(mode.provider)} webhook saved`);
    setMode({ kind: "view" });
  }

  return (
    <Box flexDirection="column" paddingX={2} marginTop={1}>
      <Text bold>Notification Settings</Text>
      <Text color="gray">{"─".repeat(50)}</Text>

      {mode.kind === "edit" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            {providerLabel(mode.provider)} webhook URL:
          </Text>
          <Box marginTop={1}>
            <Text color="cyan">{"> "}</Text>
            <TextInput
              value={mode.value}
              onChange={(v) => setMode({ ...mode, value: v })}
              onSubmit={handleSubmitUrl}
            />
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Enter save  Esc cancel</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {PROVIDERS.map((p, i) => {
            const selected = i === selectedIndex;
            const status = providerStatus(config, p.id);
            return (
              <Box key={p.id}>
                <Text color={selected ? "cyan" : undefined} bold={selected}>
                  {selected ? "❯ " : "  "}
                </Text>
                <Box width={12}>
                  <Text bold={selected}>{p.label}</Text>
                </Box>
                <Text color={status.configured ? "green" : "gray"}>
                  {status.configured ? "✓" : "○"}{" "}
                </Text>
                <Text color="gray">{status.detail}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {message && (
        <Box marginTop={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}

      {mode.kind === "view" && (
        <Box marginTop={1}>
          <Text color="gray">
            {"  "}
            <Text bold color="white">j/k</Text> navigate{"  "}
            <Text bold color="white">e</Text> edit{"  "}
            <Text bold color="white">x</Text> remove{"  "}
            <Text bold color="white">space</Text> toggle macOS{"  "}
            <Text bold color="white">Esc</Text> back
          </Text>
        </Box>
      )}
    </Box>
  );
}
