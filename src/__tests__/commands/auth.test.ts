import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/config.service", () => ({
  saveConfig: vi.fn(),
}));

vi.mock("chalk", () => {
  const fn: any = (s: string) => String(s ?? "");
  const h: ProxyHandler<typeof fn> = { get: () => new Proxy(fn, h) };
  return { default: new Proxy(fn, h) };
});

vi.mock("ora", () => ({
  default: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
  }),
}));

import { Command } from "commander";
import { saveConfig } from "../../services/config.service";
import { registerAuthCommand } from "../../commands/auth";

const mockedSaveConfig = vi.mocked(saveConfig);

function makeProgram() {
  const p = new Command();
  p.exitOverride();
  registerAuthCommand(p);
  return p;
}

describe("auth command", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => { throw new Error("process.exit"); });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("saves config with all options", async () => {
    mockedSaveConfig.mockResolvedValue({ success: true, warnings: [] });
    const p = makeProgram();
    await p.parseAsync([
      "node", "app", "auth",
      "-a", "claude",
      "-k", "sk-123",
      "-m", "claude-opus-4-7",
      "-l", "es",
    ]);
    expect(mockedSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: "claude",
        apikey: "sk-123",
        model: "claude-opus-4-7",
        lang: "es",
      }),
    );
  });

  it("exits with error for invalid URL format", async () => {
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "auth", "-u", "not-a-url"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("accepts a valid URL", async () => {
    mockedSaveConfig.mockResolvedValue({ success: true, warnings: [] });
    const p = makeProgram();
    await p.parseAsync([
      "node", "app", "auth",
      "-a", "ollama",
      "-u", "http://localhost:11434",
    ]);
    expect(mockedSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://localhost:11434" }),
    );
  });

  it("exits with code 1 when saveConfig returns an error", async () => {
    mockedSaveConfig.mockResolvedValue({
      success: false,
      error: "agent not supported",
    });
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "auth"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("prints warnings from saveConfig", async () => {
    mockedSaveConfig.mockResolvedValue({
      success: true,
      warnings: ["apikey is required"],
    });
    const p = makeProgram();
    await p.parseAsync(["node", "app", "auth"]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("apikey is required"),
    );
  });

  it("shows success message when config is saved", async () => {
    mockedSaveConfig.mockResolvedValue({ success: true, warnings: [] });
    const p = makeProgram();
    await p.parseAsync(["node", "app", "auth", "-k", "key"]);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Saved"));
  });

  it("exits with code 1 on unexpected exception", async () => {
    mockedSaveConfig.mockRejectedValue(new Error("network failure"));
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "auth"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
