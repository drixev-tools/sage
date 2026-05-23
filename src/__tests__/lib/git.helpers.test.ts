import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("child_process", () => ({ execSync: vi.fn() }));
vi.mock("fs", () => ({ readFileSync: vi.fn() }));

import { execSync } from "child_process";
import { readFileSync } from "fs";
import {
  getGitDiff,
  getGitDiffPerFile,
  getRecentCommits,
  getCurrentRepo,
  getChangedFiles,
  getGitDiffStat,
  getAllChangedFileNames,
  getWorkingTreeDiffPerFile,
  getAllTrackedFiles,
  getFileContent,
  getChangedFilesCount,
  isInsideGitRepo,
  commitMessage,
  removeJsonTag,
  removeJump,
} from "../../lib/git.helpers";

const mockedExecSync = vi.mocked(execSync);
const mockedReadFileSync = vi.mocked(readFileSync);

describe("git.helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Pure string utilities ─────────────────────────────────────────
  describe("removeJsonTag", () => {
    it("removes ```json and ``` markers", () => {
      expect(removeJsonTag('```json\n{"key":"value"}\n```')).toBe(
        '\n{"key":"value"}\n',
      );
    });

    it("handles string without markers", () => {
      expect(removeJsonTag("plain text")).toBe("plain text");
    });

    it("removes multiple occurrences", () => {
      expect(removeJsonTag("```json```json```")).toBe("");
    });

    it("removes only backtick code fences, not inline text", () => {
      expect(removeJsonTag("result: value")).toBe("result: value");
    });
  });

  describe("removeJump", () => {
    it("removes all newlines", () => {
      expect(removeJump("line1\nline2\nline3")).toBe("line1line2line3");
    });

    it("handles string without newlines", () => {
      expect(removeJump("no newlines")).toBe("no newlines");
    });

    it("handles empty string", () => {
      expect(removeJump("")).toBe("");
    });
  });

  // ── execSync wrappers ─────────────────────────────────────────────
  describe("getGitDiff", () => {
    it("returns git diff output", () => {
      mockedExecSync.mockReturnValue("diff --git a/file.ts" as any);
      expect(getGitDiff()).toBe("diff --git a/file.ts");
    });

    it("returns empty string on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("not a git repo");
      });
      expect(getGitDiff()).toBe("");
    });
  });

  describe("getGitDiffPerFile", () => {
    it("returns diff for a specific file", () => {
      mockedExecSync.mockReturnValue("diff content" as any);
      expect(getGitDiffPerFile("src/foo.ts")).toBe("diff content");
    });

    it("returns empty string on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("fail");
      });
      expect(getGitDiffPerFile("src/foo.ts")).toBe("");
    });
  });

  describe("getRecentCommits", () => {
    it("returns array of commit lines", () => {
      mockedExecSync.mockReturnValue(
        "abc123 feat: add foo\ndef456 fix: bug\n" as any,
      );
      expect(getRecentCommits(2)).toEqual([
        "abc123 feat: add foo",
        "def456 fix: bug",
      ]);
    });

    it("returns empty array on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getRecentCommits()).toEqual([]);
    });

    it("uses default n=10", () => {
      mockedExecSync.mockReturnValue("" as any);
      getRecentCommits();
      expect(mockedExecSync).toHaveBeenCalledWith("git log --oneline -10", {
        encoding: "utf-8",
      });
    });

    it("filters empty lines", () => {
      mockedExecSync.mockReturnValue("\n\nabc fix: thing\n\n" as any);
      const result = getRecentCommits(5);
      expect(result).toEqual(["abc fix: thing"]);
    });
  });

  describe("getCurrentRepo", () => {
    it("extracts repo name from HTTPS URL", () => {
      mockedExecSync.mockReturnValue(
        "https://github.com/org/my-repo.git\n" as any,
      );
      expect(getCurrentRepo()).toBe("my-repo");
    });

    it("extracts repo name from SSH URL", () => {
      mockedExecSync.mockReturnValue(
        "git@github.com:org/my-repo.git\n" as any,
      );
      expect(getCurrentRepo()).toBe("my-repo");
    });

    it("returns empty string on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getCurrentRepo()).toBe("");
    });
  });

  describe("getChangedFiles", () => {
    it("returns list of changed files", () => {
      mockedExecSync.mockReturnValue("src/foo.ts\nsrc/bar.ts\n" as any);
      expect(getChangedFiles()).toEqual(["src/foo.ts", "src/bar.ts"]);
    });

    it("returns empty array when no changes", () => {
      mockedExecSync.mockReturnValue("\n" as any);
      expect(getChangedFiles()).toEqual([]);
    });

    it("returns empty array on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getChangedFiles()).toEqual([]);
    });
  });

  describe("getGitDiffStat", () => {
    it("returns stat string", () => {
      mockedExecSync.mockReturnValue(
        "file.ts | 3 +++\n1 file changed" as any,
      );
      expect(getGitDiffStat()).toContain("file.ts");
    });

    it("returns empty string on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getGitDiffStat()).toBe("");
    });
  });

  describe("getAllChangedFileNames", () => {
    it("merges staged and unstaged files without duplicates", () => {
      mockedExecSync
        .mockReturnValueOnce("src/foo.ts\nsrc/bar.ts\n" as any) // staged
        .mockReturnValueOnce("src/bar.ts\nsrc/baz.ts\n" as any); // unstaged
      const result = getAllChangedFileNames();
      expect(result).toContain("src/foo.ts");
      expect(result).toContain("src/bar.ts");
      expect(result).toContain("src/baz.ts");
      // no duplicates
      expect(result.filter((f) => f === "src/bar.ts")).toHaveLength(1);
    });

    it("returns empty array on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getAllChangedFileNames()).toEqual([]);
    });
  });

  describe("getWorkingTreeDiffPerFile", () => {
    it("returns diff from HEAD when non-empty", () => {
      mockedExecSync.mockReturnValueOnce("diff content" as any);
      const result = getWorkingTreeDiffPerFile("src/foo.ts");
      expect(result).toBe("diff content");
      expect(mockedExecSync).toHaveBeenCalledTimes(1);
    });

    it("falls back to cached diff when HEAD diff is empty", () => {
      mockedExecSync
        .mockReturnValueOnce("  " as any) // empty after trim
        .mockReturnValueOnce("cached diff" as any);
      const result = getWorkingTreeDiffPerFile("src/foo.ts");
      expect(result).toBe("cached diff");
      expect(mockedExecSync).toHaveBeenCalledTimes(2);
    });

    it("strips double-quotes from filename", () => {
      mockedExecSync.mockReturnValueOnce("diff" as any);
      getWorkingTreeDiffPerFile('"src/foo.ts"');
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining("src/foo.ts"),
        expect.any(Object),
      );
      // Should NOT contain literal quotes in the command
      const call = (mockedExecSync.mock.calls[0][0] as string);
      expect(call).not.toContain('""');
    });

    it("returns empty string on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getWorkingTreeDiffPerFile("src/foo.ts")).toBe("");
    });
  });

  describe("getAllTrackedFiles", () => {
    it("returns only source extension files", () => {
      mockedExecSync.mockReturnValue(
        "src/foo.ts\nsrc/bar.js\nREADME.md\nsrc/style.css\n" as any,
      );
      const result = getAllTrackedFiles();
      expect(result).toContain("src/foo.ts");
      expect(result).toContain("src/bar.js");
      expect(result).not.toContain("README.md");
      expect(result).not.toContain("src/style.css");
    });

    it("excludes .d.ts declaration files", () => {
      mockedExecSync.mockReturnValue("src/foo.ts\nsrc/foo.d.ts\n" as any);
      const result = getAllTrackedFiles();
      expect(result).toContain("src/foo.ts");
      expect(result).not.toContain("src/foo.d.ts");
    });

    it("returns empty array on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getAllTrackedFiles()).toEqual([]);
    });
  });

  describe("getFileContent", () => {
    it("returns file content", () => {
      mockedReadFileSync.mockReturnValue("const x = 1;" as any);
      expect(getFileContent("src/foo.ts")).toBe("const x = 1;");
    });

    it("truncates content to 50000 chars", () => {
      const longContent = "a".repeat(60_000);
      mockedReadFileSync.mockReturnValue(longContent as any);
      expect(getFileContent("src/foo.ts")).toHaveLength(50_000);
    });

    it("returns empty string on error", () => {
      mockedReadFileSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getFileContent("src/foo.ts")).toBe("");
    });
  });

  describe("getChangedFilesCount", () => {
    it("returns count of changed files", () => {
      mockedExecSync.mockReturnValue("src/foo.ts\nsrc/bar.ts\n" as any);
      expect(getChangedFilesCount()).toBe(2);
    });

    it("returns 0 on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(getChangedFilesCount()).toBe(0);
    });
  });

  describe("isInsideGitRepo", () => {
    it("returns true when inside a git repo", () => {
      mockedExecSync.mockReturnValue(undefined as any);
      expect(isInsideGitRepo()).toBe(true);
    });

    it("returns false when not inside a git repo", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(isInsideGitRepo()).toBe(false);
    });
  });

  describe("commitMessage", () => {
    it("returns true on successful commit", () => {
      mockedExecSync.mockReturnValue(undefined as any);
      expect(commitMessage("feat: add feature")).toBe(true);
    });

    it("returns false when commit fails", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error();
      });
      expect(commitMessage("feat: add feature")).toBe(false);
    });

    it("escapes double quotes in message", () => {
      mockedExecSync.mockReturnValue(undefined as any);
      commitMessage('feat: add "quotes"');
      const call = mockedExecSync.mock.calls[0][0] as string;
      expect(call).toContain('\\"quotes\\"');
    });
  });
});
