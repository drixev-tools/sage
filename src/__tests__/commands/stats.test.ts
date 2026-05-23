import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/db.service", () => ({
  getStats: vi.fn(),
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
import { getStats } from "../../services/db.service";
import { registerStatsCommand } from "../../commands/stats";

const mockedGetStats = vi.mocked(getStats);

function makeProgram() {
  const p = new Command();
  p.exitOverride();
  registerStatsCommand(p);
  return p;
}

const SAMPLE_STATS = {
  totalCommits: 10,
  topTypes: [
    { type: "feat", count: 5 },
    { type: "fix", count: 3 },
  ],
  recentCommits: [
    { message: "feat: add feature", repo: "my-repo", created_at: "2024-01-01" },
    { message: "fix: bug", repo: "my-repo", created_at: "2024-01-02" },
  ],
};

describe("stats command", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => { throw new Error("process.exit"); });
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("fetches and displays total commits", async () => {
    mockedGetStats.mockResolvedValue(SAMPLE_STATS);
    const p = makeProgram();
    await p.parseAsync(["node", "app", "stats"]);
    expect(mockedGetStats).toHaveBeenCalled();
    const output = vi.mocked(console.info).mock.calls.flat().join(" ");
    expect(output).toContain("Total Commits: 10");
  });

  it("displays commit types with count", async () => {
    mockedGetStats.mockResolvedValue(SAMPLE_STATS);
    const p = makeProgram();
    await p.parseAsync(["node", "app", "stats"]);
    const output = vi.mocked(console.info).mock.calls.flat().join(" ");
    expect(output).toContain("feat");
    expect(output).toContain("5");
    expect(output).toContain("fix");
    expect(output).toContain("3");
  });

  it("displays recent commits with repo and date", async () => {
    mockedGetStats.mockResolvedValue(SAMPLE_STATS);
    const p = makeProgram();
    await p.parseAsync(["node", "app", "stats"]);
    const output = vi.mocked(console.info).mock.calls.flat().join(" ");
    expect(output).toContain("feat: add feature");
    expect(output).toContain("my-repo");
    expect(output).toContain("2024-01-01");
  });

  it("shows count in brackets for total types", async () => {
    mockedGetStats.mockResolvedValue({
      totalCommits: 0,
      topTypes: [],
      recentCommits: [],
    });
    const p = makeProgram();
    await p.parseAsync(["node", "app", "stats"]);
    const output = vi.mocked(console.info).mock.calls.flat().join(" ");
    // New format: [count] — shows [0] when empty
    expect(output).toContain("Total Types: [0]");
  });

  it("exits with code 1 on getStats error", async () => {
    mockedGetStats.mockRejectedValue(new Error("DB error"));
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "stats"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("DB error"),
    );
  });
});
