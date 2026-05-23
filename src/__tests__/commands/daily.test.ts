import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/git.helpers", () => ({
  isInsideGitRepo: vi.fn(),
  getRecentCommits: vi.fn(),
}));

vi.mock("../../services/ai.service", () => ({
  suggestDailyReport: vi.fn(),
}));

vi.mock("chalk", () => {
  const fn: any = (s: string) => String(s ?? "");
  const h: ProxyHandler<typeof fn> = { get: () => new Proxy(fn, h) };
  return { default: new Proxy(fn, h) };
});

// Mock print helpers so we can assert on their arguments without chalk noise
vi.mock("../../lib/print.helpers", () => ({
  printLabelAndDetailChalk: vi.fn(
    (label: string, value: string) => `${label}: ${value}`,
  ),
  printTitleChalk: vi.fn((title: string) => `── ${title} ──`),
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
import { suggestDailyReport } from "../../services/ai.service";
import { printLabelAndDetailChalk, printTitleChalk } from "../../lib/print.helpers";
import { registerDailyCommand } from "../../commands/daily";
import type { DailySpeach } from "../../types/daily.types";

const mocks = {
  isInsideGitRepo: vi.mocked(isInsideGitRepo),
  getRecentCommits: vi.mocked(getRecentCommits),
  suggestDailyReport: vi.mocked(suggestDailyReport),
  printLabelAndDetailChalk: vi.mocked(printLabelAndDetailChalk),
  printTitleChalk: vi.mocked(printTitleChalk),
};

const SAMPLE_REPORT: DailySpeach = {
  short: {
    label: "Quick Stand-up (30 seconds)",
    yesterday: "I worked on the auth module.",
    today: "I'll continue with the tests.",
    blockers: "None.",
  },
  medium: {
    label: "Full Stand-up (2 minutes)",
    yesterday: "I worked on auth and config, adding validation.",
    today: "I'll write integration tests and review open PRs.",
    blockers: "None.",
  },
};

function makeProgram() {
  const p = new Command();
  p.exitOverride();
  registerDailyCommand(p);
  return p;
}

describe("daily command", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => {
        throw new Error("process.exit");
      });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ── Guard clauses ─────────────────────────────────────────────────
  describe("guard clauses", () => {
    it("exits with 1 and logs error when not inside a git repo", async () => {
      mocks.isInsideGitRepo.mockReturnValue(false);
      const p = makeProgram();
      await expect(
        p.parseAsync(["node", "app", "daily"]),
      ).rejects.toThrow("process.exit");
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Not inside a Git repository"),
      );
    });

    it("exits with 1 when --commits is 0", async () => {
      mocks.isInsideGitRepo.mockReturnValue(true);
      const p = makeProgram();
      await expect(
        p.parseAsync(["node", "app", "daily", "--commits", "0"]),
      ).rejects.toThrow("process.exit");
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("--commits must be a positive integer"),
      );
    });

    it("exits with 1 when --commits is negative", async () => {
      mocks.isInsideGitRepo.mockReturnValue(true);
      const p = makeProgram();
      await expect(
        p.parseAsync(["node", "app", "daily", "--commits", "-3"]),
      ).rejects.toThrow("process.exit");
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  // ── Happy path ────────────────────────────────────────────────────
  describe("happy path", () => {
    beforeEach(() => {
      mocks.isInsideGitRepo.mockReturnValue(true);
      mocks.getRecentCommits.mockReturnValue([
        "abc feat: add feature",
        "def fix: bug",
      ]);
      mocks.suggestDailyReport.mockResolvedValue(SAMPLE_REPORT);
    });

    it("calls suggestDailyReport with the recent commits", async () => {
      const p = makeProgram();
      await p.parseAsync(["node", "app", "daily"]);
      expect(mocks.suggestDailyReport).toHaveBeenCalledWith([
        "abc feat: add feature",
        "def fix: bug",
      ]);
    });

    it("prints Short and Medium section titles", async () => {
      const p = makeProgram();
      await p.parseAsync(["node", "app", "daily"]);
      expect(mocks.printTitleChalk).toHaveBeenCalledWith("Short");
      expect(mocks.printTitleChalk).toHaveBeenCalledWith("Medium");
    });

    it("prints all Short report fields (label, yesterday, today, blockers)", async () => {
      const p = makeProgram();
      await p.parseAsync(["node", "app", "daily"]);
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledWith(
        "Label",
        SAMPLE_REPORT.short.label,
      );
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledWith(
        "Yesterday",
        SAMPLE_REPORT.short.yesterday,
      );
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledWith(
        "Today",
        SAMPLE_REPORT.short.today,
      );
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledWith(
        "Blockers",
        SAMPLE_REPORT.short.blockers,
      );
    });

    it("prints all Medium report fields (label, yesterday, today, blockers)", async () => {
      const p = makeProgram();
      await p.parseAsync(["node", "app", "daily"]);
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledWith(
        "Label",
        SAMPLE_REPORT.medium.label,
      );
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledWith(
        "Yesterday",
        SAMPLE_REPORT.medium.yesterday,
      );
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledWith(
        "Today",
        SAMPLE_REPORT.medium.today,
      );
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledWith(
        "Blockers",
        SAMPLE_REPORT.medium.blockers,
      );
    });

    it("calls printLabelAndDetailChalk 8 times total (4 short + 4 medium)", async () => {
      const p = makeProgram();
      await p.parseAsync(["node", "app", "daily"]);
      expect(mocks.printLabelAndDetailChalk).toHaveBeenCalledTimes(8);
    });

    it("uses the default of 5 commits when no --commits flag is given", async () => {
      const p = makeProgram();
      await p.parseAsync(["node", "app", "daily"]);
      // getRecentCommits is called with the default value "5"
      expect(mocks.getRecentCommits).toHaveBeenCalledWith("5");
    });

    it("passes --commits value through to getRecentCommits", async () => {
      const p = makeProgram();
      await p.parseAsync(["node", "app", "daily", "--commits", "10"]);
      expect(mocks.getRecentCommits).toHaveBeenCalledWith("10");
    });
  });

  // ── Error handling ────────────────────────────────────────────────
  describe("error handling", () => {
    it("exits silently with code 1 when suggestDailyReport throws", async () => {
      mocks.isInsideGitRepo.mockReturnValue(true);
      mocks.getRecentCommits.mockReturnValue(["abc feat: add"]);
      mocks.suggestDailyReport.mockRejectedValue(new Error("API failure"));
      const p = makeProgram();
      await expect(
        p.parseAsync(["node", "app", "daily"]),
      ).rejects.toThrow("process.exit");
      expect(mockExit).toHaveBeenCalledWith(1);
      // daily.ts catch block does NOT log the error (silent exit)
      expect(console.error).not.toHaveBeenCalled();
    });

    it("does not display report fields when service fails", async () => {
      mocks.isInsideGitRepo.mockReturnValue(true);
      mocks.getRecentCommits.mockReturnValue(["abc feat: add"]);
      mocks.suggestDailyReport.mockRejectedValue(new Error("network error"));
      const p = makeProgram();
      try {
        await p.parseAsync(["node", "app", "daily"]);
      } catch {}
      expect(mocks.printLabelAndDetailChalk).not.toHaveBeenCalled();
    });
  });
});
