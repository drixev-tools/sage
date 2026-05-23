import { describe, it, expect, vi, beforeEach } from "vitest";

// Chalk mock — returns input string unchanged at any chaining depth
vi.mock("chalk", () => {
  const fn: any = (s: string) => String(s ?? "");
  const handler: ProxyHandler<typeof fn> = {
    get: (_t, _p) => new Proxy(fn, handler),
  };
  return { default: new Proxy(fn, handler) };
});

import {
  printLabelAndDetailChalk,
  printTitleChalk,
  printSuccessChalk,
} from "../../lib/print.helpers";

import { printRiskTable, printFileRisk, buildFullReport } from "../../lib/print.helpers";
import type { RiskDetail } from "../../types/risk.types";

function makeDetail(override: Partial<RiskDetail["message"]> = {}): RiskDetail {
  return {
    file: "src/foo.ts",
    message: {
      summary: "Test summary",
      severity: "low",
      risks: [],
      recommendations: ["Fix it"],
      ...override,
    },
  };
}

describe("print.helpers", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  // ── buildFullReport ───────────────────────────────────────────────
  describe("buildFullReport", () => {
    it("generates markdown with header and per-file section", () => {
      const detail = makeDetail();
      const report = buildFullReport([detail], "Overall summary");
      expect(report).toContain("# Risk Analysis Report");
      expect(report).toContain("## Per-file Risks");
      expect(report).toContain("src/foo.ts");
    });

    it("includes severity in uppercase", () => {
      const detail = makeDetail({ severity: "high" });
      const report = buildFullReport([detail], "");
      expect(report).toContain("HIGH");
    });

    it("includes risks and recommendations when present", () => {
      const detail = makeDetail({
        risks: [{ id: 1, title: "SQL Injection", description: "Bad query" }],
        recommendations: ["Use parameterized queries"],
      });
      const report = buildFullReport([detail], "");
      expect(report).toContain("SQL Injection");
      expect(report).toContain("Use parameterized queries");
    });

    it("skips Risks/Recommendations sections when empty", () => {
      const detail = makeDetail({ risks: [], recommendations: [] });
      const report = buildFullReport([detail], "");
      expect(report).not.toContain("**Risks:**");
      expect(report).not.toContain("**Recommendations:**");
    });

    it("includes overall summary section", () => {
      const report = buildFullReport([], "All looks good");
      expect(report).toContain("## Overall Summary");
      expect(report).toContain("All looks good");
    });

    it("handles multiple files", () => {
      const details = [
        makeDetail({ severity: "low" }),
        { ...makeDetail({ severity: "high" }), file: "src/bar.ts" },
      ];
      const report = buildFullReport(details, "");
      expect(report).toContain("src/foo.ts");
      expect(report).toContain("src/bar.ts");
    });
  });

  // ── printRiskTable ────────────────────────────────────────────────
  describe("printRiskTable", () => {
    it("calls console.log for borders and rows", () => {
      printRiskTable([makeDetail()]);
      expect(console.log).toHaveBeenCalled();
    });

    it("does not throw for empty array", () => {
      expect(() => printRiskTable([])).not.toThrow();
    });

    it("handles unknown severity without throwing", () => {
      const detail = makeDetail({ severity: "critical" as any });
      expect(() => printRiskTable([detail])).not.toThrow();
    });

    it("handles detail with no recommendations", () => {
      const detail = makeDetail({ recommendations: [] });
      expect(() => printRiskTable([detail])).not.toThrow();
    });

    it("truncates long file names with ellipsis", () => {
      const detail = { ...makeDetail(), file: "a".repeat(50) };
      expect(() => printRiskTable([detail])).not.toThrow();
    });
  });

  // ── printFileRisk ─────────────────────────────────────────────────
  describe("printFileRisk", () => {
    it("calls console.log with file info", () => {
      printFileRisk(makeDetail({ severity: "medium" }));
      expect(console.log).toHaveBeenCalled();
    });

    it("prints each risk item", () => {
      const detail = makeDetail({
        risks: [
          { id: 1, title: "Risk A", description: "Desc A" },
          { id: 2, title: "Risk B", description: "Desc B" },
        ],
      });
      printFileRisk(detail);
      const calls = vi.mocked(console.log).mock.calls.flat().join(" ");
      expect(calls).toContain("Risk A");
      expect(calls).toContain("Risk B");
    });

    it("prints each recommendation", () => {
      const detail = makeDetail({ recommendations: ["Do better", "Add tests"] });
      printFileRisk(detail);
      const calls = vi.mocked(console.log).mock.calls.flat().join(" ");
      expect(calls).toContain("Do better");
      expect(calls).toContain("Add tests");
    });

    it("handles empty risks and recommendations gracefully", () => {
      expect(() =>
        printFileRisk(makeDetail({ risks: [], recommendations: [] })),
      ).not.toThrow();
    });
  });

  // ── printLabelAndDetailChalk ──────────────────────────────────────
  describe("printLabelAndDetailChalk", () => {
    it("returns a string containing label and desc", () => {
      const result = printLabelAndDetailChalk("Type", "feat");
      expect(result).toContain("Type");
      expect(result).toContain("feat");
    });

    it("includes a tab prefix", () => {
      const result = printLabelAndDetailChalk("Count", "5");
      expect(result).toContain("\t");
    });

    it("works with empty strings", () => {
      expect(() => printLabelAndDetailChalk("", "")).not.toThrow();
    });
  });

  // ── printTitleChalk ───────────────────────────────────────────────
  describe("printTitleChalk", () => {
    it("returns a string containing the title", () => {
      const result = printTitleChalk("Total Commits: 5");
      expect(result).toContain("Total Commits: 5");
    });

    it("includes the ── prefix", () => {
      const result = printTitleChalk("My Title");
      expect(result).toContain("──");
    });

    it("does not contain a trailing newline", () => {
      const result = printTitleChalk("Title");
      expect(result.endsWith("\n")).toBe(false);
    });
  });

  // ── printSuccessChalk ─────────────────────────────────────────────
  describe("printSuccessChalk", () => {
    it("returns a string containing the message", () => {
      const result = printSuccessChalk("Done!");
      expect(result).toContain("Done!");
    });

    it("wraps message with newlines", () => {
      const result = printSuccessChalk("OK");
      expect(result.startsWith("\n")).toBe(true);
      expect(result.endsWith("\n")).toBe(true);
    });
  });
});
