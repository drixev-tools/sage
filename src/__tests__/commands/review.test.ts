import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/git.helpers", () => ({
  isInsideGitRepo: vi.fn(),
  getGitDiff: vi.fn(),
  getGitDiffPerFile: vi.fn(),
  getAllChangedFileNames: vi.fn(),
  getWorkingTreeDiffPerFile: vi.fn(),
}));

vi.mock("../../services/ai.service", () => ({
  reviewChanges: vi.fn(),
}));

vi.mock("../../services/file.service", () => ({
  generateDoc: vi.fn(),
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
  getGitDiff,
  getGitDiffPerFile,
  getAllChangedFileNames,
  getWorkingTreeDiffPerFile,
} from "../../lib/git.helpers";
import { reviewChanges } from "../../services/ai.service";
import { generateDoc } from "../../services/file.service";
import { registerReviewCommand } from "../../commands/review";

const mocks = {
  isInsideGitRepo: vi.mocked(isInsideGitRepo),
  getGitDiff: vi.mocked(getGitDiff),
  getGitDiffPerFile: vi.mocked(getGitDiffPerFile),
  getAllChangedFileNames: vi.mocked(getAllChangedFileNames),
  getWorkingTreeDiffPerFile: vi.mocked(getWorkingTreeDiffPerFile),
  reviewChanges: vi.mocked(reviewChanges),
  generateDoc: vi.mocked(generateDoc),
};

function makeProgram() {
  const p = new Command();
  p.exitOverride();
  registerReviewCommand(p);
  return p;
}

describe("review command", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => { throw new Error("process.exit"); });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("exits when not inside a git repo", async () => {
    mocks.isInsideGitRepo.mockReturnValue(false);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "review"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("exits with 0 when there are no staged changes", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getGitDiff.mockReturnValue("   ");
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "review"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("reviews staged changes by default", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getGitDiff.mockReturnValue("diff staged content");
    mocks.reviewChanges.mockResolvedValue("## Review\nLooks good");
    const p = makeProgram();
    await p.parseAsync(["node", "app", "review"]);
    expect(mocks.reviewChanges).toHaveBeenCalledWith("diff staged content");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("## Review"),
    );
  });

  it("reviews a specific file with --file flag", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getGitDiffPerFile.mockReturnValue("diff for file");
    mocks.reviewChanges.mockResolvedValue("## Review\nFile looks good");
    const p = makeProgram();
    await p.parseAsync(["node", "app", "review", "--file", "src/foo.ts"]);
    expect(mocks.getGitDiffPerFile).toHaveBeenCalledWith("src/foo.ts");
    expect(mocks.reviewChanges).toHaveBeenCalledWith("diff for file");
  });

  it("reviews working tree diff when --file + --changes", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getWorkingTreeDiffPerFile.mockReturnValue("working tree diff");
    mocks.reviewChanges.mockResolvedValue("## Review");
    const p = makeProgram();
    await p.parseAsync([
      "node", "app", "review",
      "--file", "src/foo.ts",
      "--changes",
    ]);
    expect(mocks.getWorkingTreeDiffPerFile).toHaveBeenCalledWith("src/foo.ts");
  });

  it("exits with 0 when --changes finds no changes", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getAllChangedFileNames.mockReturnValue([]);
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "review", "--changes"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("reviews all changed files with --changes", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getAllChangedFileNames.mockReturnValue(["src/foo.ts", "src/bar.ts"]);
    mocks.getWorkingTreeDiffPerFile
      .mockReturnValueOnce("diff foo")
      .mockReturnValueOnce("diff bar");
    mocks.reviewChanges.mockResolvedValue("## Review\nAll good");
    const p = makeProgram();
    await p.parseAsync(["node", "app", "review", "--changes"]);
    expect(mocks.reviewChanges).toHaveBeenCalled();
  });

  it("saves review to file with --generate flag", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getGitDiff.mockReturnValue("diff content");
    mocks.reviewChanges.mockResolvedValue("## Review");
    mocks.generateDoc.mockResolvedValue("/path/to/review.md");
    const p = makeProgram();
    await p.parseAsync(["node", "app", "review", "--generate"]);
    expect(mocks.generateDoc).toHaveBeenCalledWith("## Review", "review");
  });

  it("exits with code 1 on AI service error", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getGitDiff.mockReturnValue("diff content");
    mocks.reviewChanges.mockRejectedValue(new Error("API failure"));
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "review"]),
    ).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("exits with 0 when --changes finds only empty diffs", async () => {
    mocks.isInsideGitRepo.mockReturnValue(true);
    mocks.getAllChangedFileNames.mockReturnValue(["src/foo.ts"]);
    mocks.getWorkingTreeDiffPerFile.mockReturnValue("   "); // blank diff
    mocks.getGitDiff.mockReturnValue("   ");
    const p = makeProgram();
    await expect(
      p.parseAsync(["node", "app", "review", "--changes"]),
    ).rejects.toThrow("process.exit");
    // After filtering empty diffs, combined diff is empty → exits 0
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
