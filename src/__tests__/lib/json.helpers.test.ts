import { describe, it, expect } from "vitest";
import { repairJson, safeParseRiskMessage } from "../../lib/json.helpers";
import type { RiskDetail } from "../../types/risk.types";

describe("repairJson", () => {
  it("returns valid JSON unchanged", () => {
    const input = JSON.stringify({ a: 1, b: [2, 3] });
    expect(repairJson(input)).toBe(input);
  });

  it("strips markdown code fences before parsing", () => {
    const input = "```json\n{\"a\":1}\n```";
    const result = repairJson(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: 1 });
  });

  it("closes a truncated object missing the closing brace", () => {
    const input = '{"summary":"ok","severity":"low","risks":[],"recommendations":[]';
    const result = repairJson(input);
    expect(result).not.toBeNull();
    expect(() => JSON.parse(result!)).not.toThrow();
  });

  it("closes a truncated array missing the closing bracket", () => {
    const input = '{"risks":[{"id":1,"title":"T","description":"D"}';
    const result = repairJson(input);
    expect(result).not.toBeNull();
    expect(() => JSON.parse(result!)).not.toThrow();
  });

  it("removes trailing comma before closing", () => {
    const input = '{"risks":[{"id":1,"title":"T","description":"D"},';
    const result = repairJson(input);
    expect(result).not.toBeNull();
    expect(() => JSON.parse(result!)).not.toThrow();
  });

  it("closes a dangling string literal", () => {
    // The description was cut off mid-string
    const input = '{"summary":"incomplete str';
    const result = repairJson(input);
    expect(result).not.toBeNull();
    expect(() => JSON.parse(result!)).not.toThrow();
  });

  it("returns null when there is no opening brace", () => {
    expect(repairJson("not json at all")).toBeNull();
  });

  it("returns null when content is irreparably broken", () => {
    // Brackets are balanced but the value is unquoted — nothing to close
    expect(repairJson('{"key": undefined}')).toBeNull();
  });
});

describe("safeParseRiskMessage", () => {
  const validMessage: RiskDetail["message"] = {
    summary: "All good",
    severity: "low",
    risks: [],
    recommendations: [],
  };

  it("parses a perfect JSON response directly", () => {
    const result = safeParseRiskMessage(JSON.stringify(validMessage), "src/foo.ts");
    expect(result.file).toBe("src/foo.ts");
    expect(result.message.severity).toBe("low");
    expect(result.message.summary).toBe("All good");
  });

  it("repairs and returns a truncated JSON response", () => {
    const truncated =
      '{"summary":"ok","severity":"medium","risks":[],"recommendations":["Fix it"';
    const result = safeParseRiskMessage(truncated, "src/bar.ts");
    expect(result.file).toBe("src/bar.ts");
    expect(result.message.severity).toBe("medium");
  });

  it("returns a fallback sentinel for an irreparably broken response", () => {
    const result = safeParseRiskMessage("not json {{{", "src/broken.ts");
    expect(result.file).toBe("src/broken.ts");
    expect(result.message.severity).toBe("low");
    expect(result.message.risks).toHaveLength(0);
    expect(result.message.summary).toContain("incomplete");
  });

  it("fallback includes a recommendation about re-running", () => {
    const result = safeParseRiskMessage("garbage", "src/x.ts");
    expect(result.message.recommendations[0]).toContain("Re-run");
  });

  it("fallback result is never null", () => {
    const result = safeParseRiskMessage("", "src/empty.ts");
    expect(result).not.toBeNull();
    expect(result.file).toBe("src/empty.ts");
  });
});
