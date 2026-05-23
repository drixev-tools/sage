import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures this fn exists when the IAAgent mock factory runs
const { mockAgentCreate } = vi.hoisted(() => ({
  mockAgentCreate: vi.fn().mockResolvedValue("mocked AI response"),
}));

vi.mock("../../services/config.service", () => ({
  getConfig: vi.fn().mockResolvedValue({
    agent: "claude",
    apikey: "sk-test",
    model: "claude-opus-4-7",
    lang: "en",
  }),
}));

vi.mock("../../llm", () => ({
  // Regular function → constructable with `new IAAgent(config)`
  IAAgent: vi.fn(function (this: any) {
    this.create = mockAgentCreate;
  }),
}));

import {
  suggestCommitMessage,
  suggestCommitMessageFromContext,
  generatePRSummary,
  reviewChanges,
  checkRiskChanges,
  checkFileRisk,
  suggestSummaryOfRisk,
} from "../../services/ai.service";
import type { RiskDetail } from "../../types/risk.types";

describe("ai.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentCreate.mockResolvedValue("mocked AI response");
  });

  it("suggestCommitMessage returns AI response", async () => {
    expect(await suggestCommitMessage("diff content")).toBe(
      "mocked AI response",
    );
  });

  it("suggestCommitMessageFromContext returns AI response", async () => {
    expect(await suggestCommitMessageFromContext("stat", "diff")).toBe(
      "mocked AI response",
    );
  });

  it("generatePRSummary returns AI response", async () => {
    expect(await generatePRSummary(["commit1", "commit2"])).toBe(
      "mocked AI response",
    );
  });

  it("reviewChanges returns AI response", async () => {
    expect(await reviewChanges("diff")).toBe("mocked AI response");
  });

  it("checkRiskChanges returns { file, message }", async () => {
    const result = await checkRiskChanges("src/foo.ts", "diff");
    expect(result.file).toBe("src/foo.ts");
    expect(result.message).toBe("mocked AI response");
  });

  it("checkFileRisk returns { file, message }", async () => {
    const result = await checkFileRisk("src/bar.ts", "file content");
    expect(result.file).toBe("src/bar.ts");
    expect(result.message).toBe("mocked AI response");
  });

  it("suggestSummaryOfRisk returns summary string", async () => {
    const observations: RiskDetail[] = [];
    expect(await suggestSummaryOfRisk(observations)).toBe("mocked AI response");
  });

  it("suggestCommitMessage calls AI with max_tokens=256", async () => {
    await suggestCommitMessage("diff");
    expect(mockAgentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 256 }),
    );
  });

  it("generatePRSummary calls AI with max_tokens=512", async () => {
    await generatePRSummary(["commit"]);
    expect(mockAgentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 512 }),
    );
  });

  it("checkRiskChanges passes removeJumpLine=true", async () => {
    await checkRiskChanges("src/foo.ts", "diff");
    expect(mockAgentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ removeJumpLine: true }),
    );
  });

  it("checkFileRisk passes removeJumpLine=true", async () => {
    await checkFileRisk("src/foo.ts", "content");
    expect(mockAgentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ removeJumpLine: true }),
    );
  });
});
