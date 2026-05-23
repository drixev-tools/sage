import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/config.service", () => ({
  getConfig: vi.fn(),
}));

vi.mock("chalk", () => {
  const fn: any = (s: string) => String(s ?? "");
  const h: ProxyHandler<typeof fn> = { get: () => new Proxy(fn, h) };
  return { default: new Proxy(fn, h) };
});

import { Command } from "commander";
import { getConfig } from "../../services/config.service";
import { registerConfigCommand } from "../../commands/config";
import { Config } from "../../types/config.types";

const mockedGetConfig = vi.mocked(getConfig);

const SAMPLE_CONFIG:Config = {
  agent: "claude",
  apikey: "sk-123",
  model: "claude-opus-4-7",
  lang: "en",
  timeout: 5000,
  maxRetries: 2,
};

function makeProgram() {
  const p = new Command();
  p.exitOverride();
  registerConfigCommand(p);
  return p;
}

describe("config command", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => { throw new Error("process.exit"); });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("shows all config by default (no flags)", async () => {
    mockedGetConfig.mockResolvedValue(SAMPLE_CONFIG);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "config"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(console.log).toHaveBeenCalled();
  });

  it("shows all config with --all flag", async () => {
    mockedGetConfig.mockResolvedValue(SAMPLE_CONFIG);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "config", "--all"]),
    ).rejects.toThrow("process.exit");
    const output = vi.mocked(console.log).mock.calls.flat().join(" ");
    expect(output).toContain("claude");
    expect(output).toContain("claude-opus-4-7");
  });

  it("shows only apikey with --apikey flag", async () => {
    mockedGetConfig.mockResolvedValue(SAMPLE_CONFIG);
    const p = makeProgram();
    await p.parseAsync(["node", "app", "config", "--apikey"]);
    const output = vi.mocked(console.log).mock.calls.flat().join(" ");
    expect(output).toContain("apikey");
    expect(output).toContain("sk-123");
    // Should NOT call process.exit(0) (that only happens with showAll)
    expect(mockExit).not.toHaveBeenCalledWith(0);
  });

  it("shows only model with --model flag", async () => {
    mockedGetConfig.mockResolvedValue(SAMPLE_CONFIG);
    const p = makeProgram();
    await p.parseAsync(["node", "app", "config", "--model"]);
    const output = vi.mocked(console.log).mock.calls.flat().join(" ");
    expect(output).toContain("model");
    expect(output).toContain("claude-opus-4-7");
  });

  it("shows timeout with --timeout flag", async () => {
    mockedGetConfig.mockResolvedValue(SAMPLE_CONFIG);
    const p = makeProgram();
    await p.parseAsync(["node", "app", "config", "--timeout"]);
    const output = vi.mocked(console.log).mock.calls.flat().join(" ");
    expect(output).toContain("timeout");
    expect(output).toContain("5000");
  });

  it("shows maxRetries with --maxRetries flag", async () => {
    mockedGetConfig.mockResolvedValue(SAMPLE_CONFIG);
    const p = makeProgram();
    await p.parseAsync(["node", "app", "config", "--maxRetries"]);
    const output = vi.mocked(console.log).mock.calls.flat().join(" ");
    expect(output).toContain("maxRetries");
    expect(output).toContain("2");
  });

  it("handles empty config (no keys)", async () => {
    mockedGetConfig.mockResolvedValue({});
    const p = makeProgram();
    // Empty config → showAll iterates nothing → exits 0
    await expect(
      p.parseAsync(["node", "app", "config"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
