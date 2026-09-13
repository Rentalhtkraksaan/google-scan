export function cleanCardCode(rawCodeOrUrl: string): string | null {
  if (!rawCodeOrUrl || typeof rawCodeOrUrl !== "string") return null;
  let clean = rawCodeOrUrl.trim().toLowerCase();
  const codeMatch = clean.match(/(?:^|\/c\/|\/)([a-zA-Z0-9]+-[a-zA-Z0-9]+)(?:$|[?#\/])/i);
  if (codeMatch && codeMatch[1]) {
    clean = codeMatch[1].toLowerCase().trim();
  } else if (clean.includes("/c/")) {
    const parts = clean.split("/c/");
    clean = parts[parts.length - 1].split("?")[0].split("#")[0].split("/")[0].trim();
  } else if (clean.includes("/")) {
    const parts = clean.split("/");
    clean = parts[parts.length - 1].split("?")[0].split("#")[0].trim();
  }
  return clean || null;
}

export function parseMultipleCardCodes(rawText: string): string[] {
  if (!rawText || typeof rawText !== "string") return [];
  const tokens = rawText
    .split(/[\r\n,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const set = new Set<string>();
  const result: string[] = [];

  for (const token of tokens) {
    const code = cleanCardCode(token);
    if (code && !set.has(code)) {
      set.add(code);
      result.push(code);
    }
  }

  return result;
}
