import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted so these exist when the mock factory runs
const { mockResponseCreate, mockChatCreate } = vi.hoisted(() => ({
  mockResponseCreate: vi.fn(),
  mockChatCreate: vi.fn(),
}));

vi.mock("openai", () => ({
  // Regular function (not arrow) → constructable with `new`
  default: vi.fn(function (this: any) {
    this.responses = { create: mockResponseCreate };
    this.chat = { completions: { create: mockChatCreate } };
  }),
}));

import { openaiAgent } from "../../../llm/providers/openai";

describe("openaiAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createOpenaiRequest ───────────────────────────────────────────
  describe("createOpenaiRequest", () => {
    it("throws when model is not configured", async () => {
      const agent = new openaiAgent({ apikey: "key" });
      await expect(
        agent.createOpenaiRequest({
          messages: [{ role: "user", content: "hi" }],
        }),
      ).rejects.toThrow("Model is required");
    });

    it("returns the output_text from the response", async () => {
      mockResponseCreate.mockResolvedValue({ output_text: "feat: add thing" });
      const agent = new openaiAgent({ apikey: "key", model: "gpt-4" });
      const result = await agent.createOpenaiRequest({
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      });
      expect(result).toBe("feat: add thing");
    });

    it("removes ```json/``` tags from output", async () => {
      mockResponseCreate.mockResolvedValue({
        output_text: "```json\n{}\n```",
      });
      const agent = new openaiAgent({ apikey: "key", model: "gpt-4" });
      const result = await agent.createOpenaiRequest({
        messages: [{ role: "user", content: "hi" }],
      });
      expect(result).not.toContain("```json");
    });

    it("removes newlines when removeJumpLine=true", async () => {
      mockResponseCreate.mockResolvedValue({ output_text: "line1\nline2" });
      const agent = new openaiAgent({ apikey: "key", model: "gpt-4" });
      const result = await agent.createOpenaiRequest({
        messages: [{ role: "user", content: "hi" }],
        removeJumpLine: true,
      });
      expect(result).toBe("line1line2");
    });
  });

  // ── createOllamaRequest ───────────────────────────────────────────
  describe("createOllamaRequest", () => {
    it("throws when model is not configured", async () => {
      const agent = new openaiAgent({ apikey: "key" });
      await expect(
        agent.createOllamaRequest({
          messages: [{ role: "user", content: "hi" }],
        }),
      ).rejects.toThrow("Model is required");
    });

    it("returns plain message content", async () => {
      // NOTE: content must NOT include "response" substring (the impl JSON-parses if it does)
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: "feat: add thing" } }],
      });
      const agent = new openaiAgent({ apikey: "key", model: "llama3" });
      expect(
        await agent.createOllamaRequest({
          messages: [{ role: "user", content: "hi" }],
        }),
      ).toBe("feat: add thing");
    });

    it("parses JSON response field when present", async () => {
      mockChatCreate.mockResolvedValue({
        choices: [
          { message: { content: '{"response":"parsed answer"}' } },
        ],
      });
      const agent = new openaiAgent({ apikey: "key", model: "llama3" });
      expect(
        await agent.createOllamaRequest({
          messages: [{ role: "user", content: "hi" }],
        }),
      ).toBe("parsed answer");
    });

    it("removes newlines when removeJumpLine=true", async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: "a\nb" } }],
      });
      const agent = new openaiAgent({ apikey: "key", model: "llama3" });
      expect(
        await agent.createOllamaRequest({
          messages: [{ role: "user", content: "hi" }],
          removeJumpLine: true,
        }),
      ).toBe("ab");
    });

    it("handles null/empty message content", async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });
      const agent = new openaiAgent({ apikey: "key", model: "llama3" });
      const result = await agent.createOllamaRequest({
        messages: [{ role: "user", content: "hi" }],
      });
      expect(result).toBe("");
    });

    it("throws for invalid base URL", async () => {
      const agent = new openaiAgent({
        apikey: "key",
        model: "llama3",
        url: "not-a-valid-url",
      });
      await expect(
        agent.createOllamaRequest({
          messages: [{ role: "user", content: "hi" }],
        }),
      ).rejects.toThrow("Invalid base URL");
    });
  });
});
