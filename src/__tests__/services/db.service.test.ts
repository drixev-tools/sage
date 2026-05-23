import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures these are defined before vi.mock factories run (ESM hoisting)
const { mockExec, mockClose, mockPrepare } = vi.hoisted(() => ({
  mockExec: vi.fn(),
  mockClose: vi.fn(),
  mockPrepare: vi.fn(),
}));

vi.mock("node:sqlite", () => ({
  // Regular function (not arrow) so it works as a constructor with `new`
  DatabaseSync: vi.fn(function (this: any) {
    this.exec = mockExec;
    this.prepare = (sql: string) => mockPrepare(sql);
    this.close = mockClose;
  }),
}));

vi.mock("fs", () => ({ existsSync: vi.fn().mockReturnValue(true) }));
vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { saveCommit, getStats } from "../../services/db.service";

function setupDefaultPrepare(opts: {
  count?: number;
  recent?: any[];
  all?: any[];
} = {}) {
  mockPrepare.mockImplementation((sql: string) => {
    if (sql.includes("COUNT")) {
      return { get: vi.fn().mockReturnValue({ count: opts.count ?? 0 }) };
    }
    if (sql.includes("ORDER BY")) {
      return { all: vi.fn().mockReturnValue(opts.recent ?? []) };
    }
    if (sql.includes("SELECT message")) {
      return { all: vi.fn().mockReturnValue(opts.all ?? []) };
    }
    // INSERT
    return { run: vi.fn() };
  });
}

describe("db.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mkdir).mockResolvedValue(undefined as any);
    mockExec.mockReturnValue(undefined);
    mockClose.mockReturnValue(undefined);
    setupDefaultPrepare();
  });

  // ── saveCommit ────────────────────────────────────────────────────
  describe("saveCommit", () => {
    it("creates the table if needed via db.exec", async () => {
      await saveCommit({ repo: "my-repo", message: "feat: add", filesChanged: 2 });
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS"),
      );
    });

    it("runs the INSERT statement with correct values", async () => {
      const mockRun = vi.fn();
      mockPrepare.mockReturnValue({ run: mockRun });
      await saveCommit({ repo: "my-repo", message: "feat: add", filesChanged: 2 });
      expect(mockRun).toHaveBeenCalledWith("my-repo", "feat: add", 2);
    });

    it("closes the database after insert", async () => {
      await saveCommit({ repo: "repo", message: "fix: bug", filesChanged: 1 });
      expect(mockClose).toHaveBeenCalled();
    });

    it("creates HOME_DIR when it does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      await saveCommit({ repo: "repo", message: "fix: bug", filesChanged: 1 });
      expect(mkdir).toHaveBeenCalled();
    });
  });

  // ── getStats ──────────────────────────────────────────────────────
  describe("getStats", () => {
    it("returns totalCommits from COUNT query", async () => {
      setupDefaultPrepare({ count: 42 });
      const stats = await getStats();
      expect(stats.totalCommits).toBe(42);
    });

    it("returns recentCommits from ORDER BY query", async () => {
      setupDefaultPrepare({
        count: 2,
        recent: [
          { message: "feat: add", repo: "repo", created_at: "2024-01-01" },
          { message: "fix: bug", repo: "repo", created_at: "2024-01-02" },
        ],
      });
      const stats = await getStats();
      expect(stats.recentCommits).toHaveLength(2);
      expect(stats.recentCommits[0].message).toBe("feat: add");
    });

    it("counts commit types correctly", async () => {
      setupDefaultPrepare({
        count: 4,
        all: [
          { message: "feat: one" },
          { message: "feat: two" },
          { message: "fix: three" },
          { message: "chore: four" },
        ],
      });
      const stats = await getStats();
      const feat = stats.topTypes.find((t) => t.type === "feat");
      const fix = stats.topTypes.find((t) => t.type === "fix");
      expect(feat?.count).toBe(2);
      expect(fix?.count).toBe(1);
    });

    it("returns at most 5 top types", async () => {
      setupDefaultPrepare({
        count: 6,
        all: ["feat", "fix", "chore", "docs", "refactor", "test"].map(
          (t) => ({ message: `${t}: something` }),
        ),
      });
      const stats = await getStats();
      expect(stats.topTypes.length).toBeLessThanOrEqual(5);
    });

    it("ignores messages without conventional commit format", async () => {
      setupDefaultPrepare({
        count: 1,
        all: [{ message: "not a conventional commit" }],
      });
      const stats = await getStats();
      expect(stats.topTypes).toHaveLength(0);
    });

    it("closes the database after queries", async () => {
      await getStats();
      expect(mockClose).toHaveBeenCalled();
    });

    it("sorts top types by count descending", async () => {
      setupDefaultPrepare({
        count: 4,
        all: [
          { message: "fix: a" },
          { message: "feat: b" },
          { message: "feat: c" },
          { message: "feat: d" },
        ],
      });
      const stats = await getStats();
      expect(stats.topTypes[0].type).toBe("feat");
      expect(stats.topTypes[0].count).toBe(3);
    });
  });
});
