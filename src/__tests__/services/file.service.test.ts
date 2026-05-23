import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({ existsSync: vi.fn() }));
vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({ unref: vi.fn() })),
}));

import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { generateDoc } from "../../services/file.service";

const mockedExistsSync = vi.mocked(existsSync);
const mockedWriteFile = vi.mocked(writeFile);
const mockedMkdir = vi.mocked(mkdir);
const mockedSpawn = vi.mocked(spawn);

describe("file.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedWriteFile.mockResolvedValue(undefined as any);
    mockedMkdir.mockResolvedValue(undefined as any);
  });

  describe("generateDoc", () => {
    it("creates directory when it does not exist", async () => {
      mockedExistsSync.mockReturnValue(false);
      await generateDoc("content", "summary");
      expect(mockedMkdir).toHaveBeenCalledWith(
        expect.stringContaining(".docs"),
        { recursive: true },
      );
    });

    it("does not create directory when it already exists", async () => {
      mockedExistsSync.mockReturnValue(true);
      await generateDoc("content", "summary");
      expect(mockedMkdir).not.toHaveBeenCalled();
    });

    it("writes file with the provided content", async () => {
      mockedExistsSync.mockReturnValue(true);
      await generateDoc("my report content", "review");
      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("review_"),
        "my report content",
        { encoding: "utf-8" },
      );
    });

    it("returns the generated file path ending in .md", async () => {
      mockedExistsSync.mockReturnValue(true);
      const path = await generateDoc("content", "risk");
      expect(path).toContain("risk_");
      expect(path.endsWith(".md")).toBe(true);
    });

    it("uses initialName as prefix in the filename", async () => {
      mockedExistsSync.mockReturnValue(true);
      const path = await generateDoc("content", "summary");
      expect(path).toContain("summary_");
    });

    it("calls spawn to open the file after writing", async () => {
      mockedExistsSync.mockReturnValue(true);
      await generateDoc("content", "summary");
      expect(mockedSpawn).toHaveBeenCalled();
    });

    it("calls unref() on the spawned process", async () => {
      mockedExistsSync.mockReturnValue(true);
      const mockUnref = vi.fn();
      mockedSpawn.mockReturnValue({ unref: mockUnref } as any);
      await generateDoc("content", "summary");
      expect(mockUnref).toHaveBeenCalled();
    });
  });
});
