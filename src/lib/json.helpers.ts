import { RiskDetail } from "../types/risk.types";

export function repairJson(raw: string): string | null {
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    JSON.parse(text);
    return text;
  } catch {
    /* continue to repair */
  }

  const start = text.indexOf("{");
  if (start === -1) return null;
  text = text.slice(start);

  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let repaired = text.trimEnd();
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, "");
  repaired += stack.reverse().join("");

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

export function safeParseRiskMessage(raw: string, file: string): RiskDetail {
  try {
    return { file, message: JSON.parse(raw) as RiskDetail["message"] };
  } catch {
    /* try repair */
  }

  const repaired = repairJson(raw);
  if (repaired) {
    try {
      return { file, message: JSON.parse(repaired) as RiskDetail["message"] };
    } catch {
      /* fall through to fallback */
    }
  }

  return {
    file,
    message: {
      summary: "Analysis incomplete — model response was truncated or malformed.",
      severity: "low",
      risks: [],
      recommendations: [
        "Re-run on this file individually, or use a model with a larger output token limit.",
      ],
    },
  };
}
