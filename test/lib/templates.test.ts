import { describe, it, expect } from "vitest";
import {
  TEMPLATES,
  getTemplate,
  listTemplates,
  templateToTaskInput,
  type TaskTemplate,
} from "../../src/lib/templates.js";

describe("TEMPLATES", () => {
  it("should have at least 4 built-in templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(4);
  });

  it("should have unique ids", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have required fields on every template", () => {
    for (const t of TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.agent).toBeTruthy();
      expect(t.prompt).toBeTruthy();
      expect(t.scheduleType).toBeTruthy();
    }
  });
});

describe("getTemplate", () => {
  it("should return a template by id", () => {
    const t = getTemplate("daily-tests");
    expect(t).toBeDefined();
    expect(t!.id).toBe("daily-tests");
  });

  it("should return undefined for unknown id", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });
});

describe("listTemplates", () => {
  it("should return all templates", () => {
    const all = listTemplates();
    expect(all).toEqual(TEMPLATES);
  });
});

describe("templateToTaskInput", () => {
  it("should convert template to CreateTaskInput with defaults", () => {
    const t = getTemplate("daily-tests")!;
    const input = templateToTaskInput(t, { workingDir: "/my/project" });

    expect(input.name).toBe(t.label);
    expect(input.agent).toBe(t.agent);
    expect(input.command).toBeTruthy();
    expect(input.workingDir).toBe("/my/project");
    expect(input.scheduleType).toBe(t.scheduleType);
  });

  it("should allow overriding name", () => {
    const t = getTemplate("daily-tests")!;
    const input = templateToTaskInput(t, {
      workingDir: "/tmp",
      name: "Custom Name",
    });
    expect(input.name).toBe("Custom Name");
  });

  it("should allow overriding cron schedule", () => {
    const t = getTemplate("daily-tests")!;
    const input = templateToTaskInput(t, {
      workingDir: "/tmp",
      scheduleCron: "0 8 * * *",
    });
    expect(input.scheduleCron).toBe("0 8 * * *");
  });

  it("should use template cron as default", () => {
    const t = getTemplate("daily-tests")!;
    const input = templateToTaskInput(t, { workingDir: "/tmp" });
    expect(input.scheduleCron).toBe(t.scheduleCron);
  });
});
