import { describe, it, expect } from "vitest";
import {
  getCommitMessage,
  getCommitMessageFromContext,
  getSummaryRisks,
  getFileRisk,
  getSummaryOfRisk,
  getSummaryPRMessage,
  getReviewMessage,
} from "../../lib/prompts";
import type { RiskDetail } from "../../types/risk.types";

describe("prompts", () => {
  // ── getCommitMessage ──────────────────────────────────────────────
  describe("getCommitMessage", () => {
    it("includes the diff inside <diff> tags", () => {
      const result = getCommitMessage("my diff content", "en");
      expect(result).toContain("my diff content");
      expect(result).toContain("<diff>");
    });

    it("includes the valid language", () => {
      const result = getCommitMessage("", "es");
      expect(result).toContain("'es'");
    });

    it('falls back to "en" for unsupported language', () => {
      const result = getCommitMessage("", "fr");
      expect(result).toContain("'en'");
    });

    it('falls back to "en" for empty language string', () => {
      const result = getCommitMessage("", "");
      expect(result).toContain("'en'");
    });

    it("truncates diff at 50 000 chars", () => {
      const bigDiff = "x".repeat(60_000);
      const result = getCommitMessage(bigDiff, "en");
      const diffSection =
        result.match(/<diff>([\s\S]*?)<\/diff>/)?.[1] ?? "";
      expect(diffSection.trim().length).toBeLessThanOrEqual(50_000);
    });

    it("removes null bytes from diff", () => {
      const result = getCommitMessage("diff\x00content", "en");
      expect(result).not.toContain("\x00");
    });

    it("mentions Conventional Commits rules", () => {
      const result = getCommitMessage("", "en");
      expect(result).toContain("feat");
      expect(result).toContain("fix");
    });
  });

  // ── getCommitMessageFromContext ───────────────────────────────────
  describe("getCommitMessageFromContext", () => {
    it("includes stat inside <stat> tags", () => {
      const result = getCommitMessageFromContext("stat here", "diff here", "en");
      expect(result).toContain("stat here");
      expect(result).toContain("<stat>");
    });

    it("includes topDiff inside <diff> tags", () => {
      const result = getCommitMessageFromContext("", "diff here", "en");
      expect(result).toContain("diff here");
    });

    it("sanitizes language", () => {
      const result = getCommitMessageFromContext("", "", "zh");
      expect(result).toContain("'en'");
    });

    it("supports Spanish language", () => {
      const result = getCommitMessageFromContext("", "", "es");
      expect(result).toContain("'es'");
    });
  });

  // ── getSummaryRisks ───────────────────────────────────────────────
  describe("getSummaryRisks", () => {
    it("includes the diff content", () => {
      const result = getSummaryRisks("diff text here", "en");
      expect(result).toContain("diff text here");
    });

    it("asks for JSON structure with severity field", () => {
      const result = getSummaryRisks("", "en");
      expect(result).toContain("severity");
      expect(result).toContain("recommendations");
      expect(result).toContain("risks");
    });

    it("mentions security review purpose", () => {
      const result = getSummaryRisks("", "en");
      expect(result).toContain("security");
    });
  });

  // ── getFileRisk ───────────────────────────────────────────────────
  describe("getFileRisk", () => {
    it("includes file content in <content> tags", () => {
      const result = getFileRisk("const x = 1;", "src/foo.ts", "en");
      expect(result).toContain("const x = 1;");
      expect(result).toContain("<content>");
    });

    it("includes the filename", () => {
      const result = getFileRisk("content", "src/secret.ts", "en");
      expect(result).toContain("src/secret.ts");
    });

    it("applies language sanitization", () => {
      const result = getFileRisk("", "", "de");
      expect(result).toContain("'en'");
    });
  });

  // ── getSummaryOfRisk ──────────────────────────────────────────────
  describe("getSummaryOfRisk", () => {
    it("includes serialized observations", () => {
      const observations: RiskDetail[] = [
        {
          file: "src/auth.ts",
          message: {
            summary: "Auth weakness",
            risks: [{ id: 1, title: "SQL Injection", description: "Bad query" }],
            severity: "high",
            recommendations: ["Use prepared statements"],
          },
        },
      ];
      const result = getSummaryOfRisk(observations, "en");
      expect(result).toContain("src/auth.ts");
      expect(result).toContain("SQL Injection");
    });

    it("handles empty observations", () => {
      const result = getSummaryOfRisk([], "en");
      expect(result).toContain("[]");
    });

    it("applies language", () => {
      const result = getSummaryOfRisk([], "es");
      expect(result).toContain("'es'");
    });
  });

  // ── getSummaryPRMessage ───────────────────────────────────────────
  describe("getSummaryPRMessage", () => {
    it("includes commit messages numbered", () => {
      const commits = ["abc feat: add feature", "def fix: bug"];
      const result = getSummaryPRMessage(commits, "en");
      expect(result).toContain("1. abc feat: add feature");
      expect(result).toContain("2. def fix: bug");
    });

    it("truncates each commit to 2 000 chars", () => {
      const longCommit = "a".repeat(3_000);
      const result = getSummaryPRMessage([longCommit], "en");
      expect(result).not.toContain("a".repeat(3_000));
      // 2000-char version should be present
      expect(result).toContain("a".repeat(2_000));
    });

    it("requires PR sections in output", () => {
      const result = getSummaryPRMessage(["fix: something"], "en");
      expect(result).toContain("## Summary");
      expect(result).toContain("## Changes");
    });

    it("supports es language", () => {
      const result = getSummaryPRMessage([], "es");
      expect(result).toContain("'es'");
    });
  });

  // ── getReviewMessage ──────────────────────────────────────────────
  describe("getReviewMessage", () => {
    it("includes the diff", () => {
      const result = getReviewMessage("diff content", "en");
      expect(result).toContain("diff content");
    });

    it("mentions key review areas", () => {
      const result = getReviewMessage("", "en");
      expect(result).toContain("Readability");
      expect(result).toContain("Complexity");
      expect(result).toContain("Duplication");
    });

    it("includes <diff> tags", () => {
      const result = getReviewMessage("change", "en");
      expect(result).toContain("<diff>");
    });

    it("applies language sanitization", () => {
      const result = getReviewMessage("", "invalid");
      expect(result).toContain("'en'");
    });
  });
});
