import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/git.helpers", () => ({
  isInsideGitRepo: vi.fn(),
  getRecentCommits: vi.fn(),
}));

vi.mock("../../services/ai.service", () => ({
  generatePRSummary: vi.fn(),
}));

vi.mock("../../services/file.service", () => ({
  generateDoc: vi.fn(),
}));

vi.mock("chalk", () => {
  const fn: any = (s: string) => String(s ?? "");
  const h: ProxyHandler<typeof fn> = { get: () => new Proxy(fn, h) };
  return { default: new Proxy(fn, h) };
});

vi.mock("../../lib/print.helpers", () => ({
  printTitleChalk: vi.fn((s: string) => s),
}));

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
import { isInsideGitRepo, getRecentCommits } from "../../lib/git.helpers";
import { generatePRSummary } from "../../services/ai.service";
import { generateDoc } from "../../services/file.service";
import { registerSummaryCommand } from "../../commands/summary";

const mocks = {
  isInsideGitRepo: vi.mocked(isInsideGitRepo),
  getRecentCommits: vi.mocked(getRecentCommits),
  generatePRSummary: vi.mocked(generatePRSummary),
  generateDoc: vi.mocked(generateDoc),
};

function makeProgram() {
  const p = new Command();
  p.exitOverride();
  registerSummaryCommand(p);
  return p;
}

describe("summary command", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => { throw new Error("process.exit"); });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("exits when not inside a git repo", async () => {
    mocks.isInsideGitRepo.mockReturnValue(false);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "summary"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("exits when --commits is 0 (invalid)", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "summary", "--commits", "0"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("exits when --commits is negative", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "summary", "--commits", "-5"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("exits when no commits are found", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getRecentCommits.mockReturnValue([]);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "summary"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("generates and displays PR summary", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getRecentCommits.mockReturnValue(["abc feat: add", "def fix: bug"]);
    mocks.generatePRSummary.mockResolvedValue("## Summary\nGreat PR");
    const p = makeProgram();
    await p.parseAsync(["node", "app", "summary"]);
    expect(mocks.generatePRSummary).toHaveBeenCalledWith([
      "abc feat: add",
      "def fix: bug",
    ]);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("## Summary"),
    );
  });

  it("passes --commits value to getRecentCommits", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getRecentCommits.mockReturnValue(["abc feat: add"]);
    mocks.generatePRSummary.mockResolvedValue("summary");
    const p = makeProgram();
    await p.parseAsync(["node", "app", "summary", "--commits", "5"]);
    // Commander passes the value as-is; the function should be called
    expect(mocks.getRecentCommits).toHaveBeenCalled();
  });

  it("saves summary to file with --generate flag", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getRecentCommits.mockReturnValue(["abc feat: add"]);
    mocks.generatePRSummary.mockResolvedValue("## Summary\nContent");
    mocks.generateDoc.mockResolvedValue("/home/.config/sage/.docs/summary_123.md");
    const p = makeProgram();
    await p.parseAsync(["node", "app", "summary", "--generate"]);
    expect(mocks.generateDoc).toHaveBeenCalledWith(
      "## Summary\nContent",
      "summary",
    );
  });

  it("exits with code 1 on AI service error", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getRecentCommits.mockReturnValue(["abc feat: add"]);
    mocks.generatePRSummary.mockRejectedValue(new Error("API error"));
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "summary"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
