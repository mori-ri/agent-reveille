type PlistValue =
  | string
  | number
  | boolean
  | PlistValue[]
  | { [key: string]: PlistValue };

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function serializeValue(value: PlistValue, indent: number): string {
  const pad = "\t".repeat(indent);

  if (typeof value === "string") {
    return `${pad}<string>${escapeXml(value)}</string>`;
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return `${pad}<integer>${value}</integer>`;
    }
    return `${pad}<real>${value}</real>`;
  }
  if (typeof value === "boolean") {
    return `${pad}<${value}/>`;
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => serializeValue(v, indent + 1)).join("\n");
    return `${pad}<array>\n${items}\n${pad}</array>`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .map(
        ([k, v]) =>
          `${pad}\t<key>${escapeXml(k)}</key>\n${serializeValue(v, indent + 1)}`
      )
      .join("\n");
    return `${pad}<dict>\n${entries}\n${pad}</dict>`;
  }
  return "";
}

export function serializePlist(obj: { [key: string]: PlistValue }): string {
  const body = serializeValue(obj, 0);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
${body}
</plist>
`;
}
