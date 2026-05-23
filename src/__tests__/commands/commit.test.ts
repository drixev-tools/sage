import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/git.helpers", () => ({
  isInsideGitRepo: vi.fn(),
  getChangedFiles: vi.fn(),
  getGitDiffStat: vi.fn(),
  getGitDiffPerFile: vi.fn(),
  commitMessage: vi.fn(),
  getChangedFilesCount: vi.fn(),
  getCurrentRepo: vi.fn(),
}));

vi.mock("../../services/ai.service", () => ({
  suggestCommitMessageFromContext: vi.fn(),
}));

vi.mock("../../services/db.service", () => ({
  saveCommit: vi.fn(),
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
import {
  isInsideGitRepo,
  getChangedFiles,
  getGitDiffStat,
  getGitDiffPerFile,
  commitMessage,
  getChangedFilesCount,
  getCurrentRepo,
} from "../../lib/git.helpers";
import { suggestCommitMessageFromContext } from "../../services/ai.service";
import { saveCommit } from "../../services/db.service";
import { registerCommitCommand } from "../../commands/commit";

const mocks = {
  isInsideGitRepo: vi.mocked(isInsideGitRepo),
  getChangedFiles: vi.mocked(getChangedFiles),
  getGitDiffStat: vi.mocked(getGitDiffStat),
  getGitDiffPerFile: vi.mocked(getGitDiffPerFile),
  commitMessage: vi.mocked(commitMessage),
  getChangedFilesCount: vi.mocked(getChangedFilesCount),
  getCurrentRepo: vi.mocked(getCurrentRepo),
  suggestCommitMessageFromContext: vi.mocked(suggestCommitMessageFromContext),
  saveCommit: vi.mocked(saveCommit),
};

function makeProgram() {
  const p = new Command();
  p.exitOverride();
  registerCommitCommand(p);
  return p;
}

describe("commit command", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => { throw new Error("process.exit"); });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("exits when not inside a git repo", async () => {
    mocks.isInsideGitRepo.mockReturnValue(false);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "commit"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalled();
  });

  it("exits when there are no staged changes", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getChangedFiles.mockReturnValue([]);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "commit"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("generates and shows commit message (no --yes)", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getChangedFiles.mockReturnValue(["src/foo.ts"]);
    mocks.getGitDiffStat.mockReturnValue("1 file changed");
    mocks.getGitDiffPerFile.mockReturnValue("diff content");
    mocks.suggestCommitMessageFromContext.mockResolvedValue(
      "feat: add feature",
    );
    const p = makeProgram();
    await p.parseAsync(["node", "app", "commit"]);
    expect(mocks.suggestCommitMessageFromContext).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("feat: add feature"),
    );
    // Without --yes, should NOT commit
    expect(mocks.commitMessage).not.toHaveBeenCalled();
  });

  it("commits immediately with --yes flag", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getChangedFiles.mockReturnValue(["src/foo.ts"]);
    mocks.getGitDiffStat.mockReturnValue("stat");
    mocks.getGitDiffPerFile.mockReturnValue("diff");
    mocks.suggestCommitMessageFromContext.mockResolvedValue("feat: something");
    mocks.commitMessage.mockReturnValue(true);
    mocks.getCurrentRepo.mockReturnValue("my-repo");
    mocks.getChangedFilesCount.mockReturnValue(1);
    mocks.saveCommit.mockResolvedValue(undefined);
    const p = makeProgram();
    await p.parseAsync(["node", "app", "commit", "--yes"]);
    expect(mocks.commitMessage).toHaveBeenCalledWith("feat: something");
    expect(mocks.saveCommit).toHaveBeenCalledWith(
      expect.objectContaining({ repo: "my-repo", message: "feat: something" }),
    );
  });

  it("exits with code 1 when commit fails (--yes)", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getChangedFiles.mockReturnValue(["src/foo.ts"]);
    mocks.getGitDiffStat.mockReturnValue("stat");
    mocks.getGitDiffPerFile.mockReturnValue("diff");
    mocks.suggestCommitMessageFromContext.mockResolvedValue("fix: bug");
    mocks.commitMessage.mockReturnValue(false);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "commit", "--yes"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("exits with code 1 on AI service error", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getChangedFiles.mockReturnValue(["src/foo.ts"]);
    mocks.getGitDiffStat.mockReturnValue("stat");
    mocks.getGitDiffPerFile.mockReturnValue("diff");
    mocks.suggestCommitMessageFromContext.mockRejectedValue(
      new Error("API error"),
    );
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "commit"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("respects FALLBACK_DIFF_BUDGET when building topDiff", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getChangedFiles.mockReturnValue(["a.ts", "b.ts"]);
    mocks.getGitDiffStat.mockReturnValue("stat");
    // First file exceeds budget
    mocks.getGitDiffPerFile
      .mockReturnValueOnce("x".repeat(9_000))
      .mockReturnValueOnce("y".repeat(9_000));
    mocks.suggestCommitMessageFromContext.mockResolvedValue("chore: update");
    const p = makeProgram();
    await p.parseAsync(["node", "app", "commit"]);
    // Only the first (longest) diff should fit in budget
    const [, topDiff] = mocks.suggestCommitMessageFromContext.mock.calls[0];
    expect((topDiff as string).length).toBeLessThanOrEqual(9_000 + 1);
  });
});
