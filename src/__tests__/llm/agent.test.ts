import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted so mock fns exist when the mock factories run
const { mockCreateClaude, mockCreateOpenai, mockCreateOllama } = vi.hoisted(
  () => ({
    mockCreateClaude: vi.fn().mockResolvedValue("claude response"),
    mockCreateOpenai: vi.fn().mockResolvedValue("openai response"),
    mockCreateOllama: vi.fn().mockResolvedValue("ollama response"),
  }),
);

vi.mock("../../llm/providers/claude", () => ({
  IAClaudeAgent: vi.fn(function (this: any) {
    this.createClaudeRequest = mockCreateClaude;
  }),
}));

vi.mock("../../llm/providers/openai", () => ({
  openaiAgent: vi.fn(function (this: any) {
    this.createOpenaiRequest = mockCreateOpenai;
    this.createOllamaRequest = mockCreateOllama;
  }),
}));

import { IAAgent } from "../../llm";
import { IAClaudeAgent } from "../../llm/providers/claude";
import { openaiAgent } from "../../llm/providers/openai";

describe("IAAgent", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClaude.mockResolvedValue("claude response");
    mockCreateOpenai.mockResolvedValue("openai response");
    mockCreateOllama.mockResolvedValue("ollama response");
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ── Provider selection ────────────────────────────────────────────
  it("uses claude provider by default", async () => {
    const agent = new IAAgent({ apikey: "key", model: "claude-opus-4-7" });
    await agent.create({ message: "hello", max_tokens: 100 });
    expect(IAClaudeAgent).toHaveBeenCalled();
    expect(mockCreateClaude).toHaveBeenCalledWith("hello", 100, undefined);
  });

  it("uses claude provider when agent='claude'", async () => {
    const agent = new IAAgent({
      agent: "claude",
      apikey: "key",
      model: "model",
    });
    await agent.create({ message: "hello", max_tokens: 50 });
    expect(IAClaudeAgent).toHaveBeenCalled();
  });

  it("uses openai provider when agent='openai'", async () => {
    const agent = new IAAgent({
      agent: "openai",
      apikey: "key",
      model: "gpt-4",
    });
    await agent.create({ message: "hello", max_tokens: 100 });
    expect(openaiAgent).toHaveBeenCalled();
    expect(mockCreateOpenai).toHaveBeenCalled();
  });

  it("uses ollama provider (openaiAgent under the hood)", async () => {
    const agent = new IAAgent({
      agent: "ollama",
      apikey: "key",
      model: "llama3",
    });
    await agent.create({ message: "hello", max_tokens: 100 });
    expect(openaiAgent).toHaveBeenCalled();
    expect(mockCreateOllama).toHaveBeenCalled();
  });

  it("passes removeJumpLine option through to the provider", async () => {
    const agent = new IAAgent({ apikey: "key", model: "model" });
    await agent.create({ message: "hello", max_tokens: 100, removeJumpLine: true });
    expect(mockCreateClaude).toHaveBeenCalledWith("hello", 100, true);
  });

  // ── Guard clauses ─────────────────────────────────────────────────
  it("calls process.exit(1) when apikey is missing", () => {
    const agent = new IAAgent({ model: "model" });
    agent.create({ message: "hello", max_tokens: 100 });
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("calls process.exit(1) when model is missing", () => {
    const agent = new IAAgent({ apikey: "key" });
    agent.create({ message: "hello", max_tokens: 100 });
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
