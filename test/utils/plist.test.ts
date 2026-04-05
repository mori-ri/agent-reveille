import { describe, expect, it } from "vitest";
import { serializePlist } from "../../src/utils/plist.js";

describe("serializePlist", () => {
  it("should generate valid plist XML", () => {
    const result = serializePlist({
      Label: "com.test.example",
      ProgramArguments: ["/usr/bin/echo", "hello"],
      StartInterval: 300,
      RunAtLoad: false,
    });

    expect(result).toContain('<?xml version="1.0"');
    expect(result).toContain("<key>Label</key>");
    expect(result).toContain("<string>com.test.example</string>");
    expect(result).toContain("<key>StartInterval</key>");
    expect(result).toContain("<integer>300</integer>");
    expect(result).toContain("<false/>");
    expect(result).toContain("<array>");
    expect(result).toContain("<string>/usr/bin/echo</string>");
  });

  it("should escape XML special characters", () => {
    const result = serializePlist({
      Label: "test&<>",
    });

    expect(result).toContain("test&amp;&lt;&gt;");
  });

  it("should handle nested dicts", () => {
    const result = serializePlist({
      EnvironmentVariables: {
        PATH: "/usr/bin",
        HOME: "/Users/test",
      },
    });

    expect(result).toContain("<key>EnvironmentVariables</key>");
    expect(result).toContain("<key>PATH</key>");
    expect(result).toContain("<string>/usr/bin</string>");
  });
});
