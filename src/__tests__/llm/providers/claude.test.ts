import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted so the mock fn exists when the factory runs
const { mockMessagesCreate } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  // Regular function (not arrow) → constructable with `new`
  default: vi.fn(function (this: any) {
    this.messages = { create: mockMessagesCreate };
  }),
}));

import { IAClaudeAgent } from "../../../llm/providers/claude";

function textMessage(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("IAClaudeAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createClaudeRequest", () => {
    it("returns text content from a successful response", async () => {
      mockMessagesCreate.mockResolvedValue(textMessage("feat: add feature"));
      const agent = new IAClaudeAgent({ apikey: "key", model: "claude-opus-4-7" });
      expect(await agent.createClaudeRequest("message", 256)).toBe(
        "feat: add feature",
      );
    });

    it("returns empty string for non-text content blocks", async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: "image" }],
      });
      const agent = new IAClaudeAgent({ apikey: "key", model: "model" });
      expect(await agent.createClaudeRequest("message", 256)).toBe("");
    });

    it("removes ```json and ``` markers from the response", async () => {
      mockMessagesCreate.mockResolvedValue(
        textMessage("```json\n{\"key\":\"val\"}\n```"),
      );
      const agent = new IAClaudeAgent({ apikey: "key", model: "model" });
      const result = await agent.createClaudeRequest("message", 256);
      expect(result).not.toContain("```json");
      expect(result).not.toContain("```");
    });

    it("removes newlines when removeJumpLine=true", async () => {
      mockMessagesCreate.mockResolvedValue(textMessage("line1\nline2\nline3"));
      const agent = new IAClaudeAgent({ apikey: "key", model: "model" });
      expect(await agent.createClaudeRequest("message", 256, true)).toBe(
        "line1line2line3",
      );
    });

    it("preserves newlines when removeJumpLine is not set", async () => {
      mockMessagesCreate.mockResolvedValue(textMessage("line1\nline2"));
      const agent = new IAClaudeAgent({ apikey: "key", model: "model" });
      const result = await agent.createClaudeRequest("message", 256);
      expect(result).toContain("\n");
    });

    it("wraps API errors with a descriptive message", async () => {
      mockMessagesCreate.mockRejectedValue(new Error("rate limited"));
      const agent = new IAClaudeAgent({ apikey: "key", model: "model" });
      await expect(agent.createClaudeRequest("message", 256)).rejects.toThrow(
        "Claude API request failed: rate limited",
      );
    });

    it("wraps non-Error failures in a descriptive error", async () => {
      mockMessagesCreate.mockRejectedValue("string error");
      const agent = new IAClaudeAgent({ apikey: "key", model: "model" });
      await expect(agent.createClaudeRequest("message", 256)).rejects.toThrow(
        "Claude API request failed",
      );
    });
  });

  describe("getClaudeIAClient", () => {
    it("returns an Anthropic client instance", () => {
      const agent = new IAClaudeAgent({
        apikey: "key",
        model: "model",
        timeout: 5000,
        maxRetries: 2,
      });
      expect(agent.getClaudeIAClient()).toBeDefined();
    });
  });

  describe("cleanContent", () => {
    it("extracts text from text blocks", () => {
      const agent = new IAClaudeAgent({ apikey: "key", model: "model" });
      const msg: any = { content: [{ type: "text", text: "hello world" }] };
      expect(agent.cleanContent(msg)).toBe("hello world");
    });

    it("returns empty string for non-text block", () => {
      const agent = new IAClaudeAgent({ apikey: "key", model: "model" });
      const msg: any = { content: [{ type: "tool_use", id: "1" }] };
      expect(agent.cleanContent(msg)).toBe("");
    });
  });
});
