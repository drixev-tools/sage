import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({ existsSync: vi.fn() }));
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { saveConfig, getConfig } from "../../services/config.service";

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFile = vi.mocked(readFile);
const mockedWriteFile = vi.mocked(writeFile);
const mockedMkdir = vi.mocked(mkdir);

describe("config.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedWriteFile.mockResolvedValue(undefined as any);
    mockedMkdir.mockResolvedValue(undefined as any);
  });

  // ── getConfig ─────────────────────────────────────────────────────
  describe("getConfig", () => {
    it("returns empty object when config file does not exist", async () => {
      mockedExistsSync.mockReturnValue(false);
      expect(await getConfig()).toEqual({});
    });

    it("returns parsed config when file exists", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(
        JSON.stringify({ agent: "claude", model: "claude-opus-4-7" }) as any,
      );
      const config = await getConfig();
      expect(config.agent).toBe("claude");
      expect(config.model).toBe("claude-opus-4-7");
    });

    it("returns empty object when config file has invalid JSON", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue("invalid json" as any);
      expect(await getConfig()).toEqual({});
    });
  });

  // ── saveConfig ────────────────────────────────────────────────────
  describe("saveConfig", () => {
    it("returns error for unsupported agent", async () => {
      mockedExistsSync.mockReturnValue(false);
      const result = await saveConfig({ agent: "gemini" as any });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("returns error for ollama without URL", async () => {
      mockedExistsSync.mockReturnValue(false);
      const result = await saveConfig({ agent: "ollama" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("url");
    });

    it("succeeds with valid claude config", async () => {
      mockedExistsSync.mockReturnValue(false);
      const result = await saveConfig({
        agent: "claude",
        apikey: "sk-123",
        model: "claude-opus-4-7",
      });
      expect(result.success).toBe(true);
      expect(mockedWriteFile).toHaveBeenCalled();
    });

    it("succeeds with openai config", async () => {
      mockedExistsSync.mockReturnValue(false);
      const result = await saveConfig({
        agent: "openai",
        apikey: "sk-oai",
        model: "gpt-4",
      });
      expect(result.success).toBe(true);
    });

    it("succeeds with ollama + url", async () => {
      mockedExistsSync.mockReturnValue(false);
      const result = await saveConfig({
        agent: "ollama",
        url: "http://localhost:11434",
        apikey: "key",
        model: "llama3",
      });
      expect(result.success).toBe(true);
    });

    it("emits warnings when agent/apikey/model are missing", async () => {
      mockedExistsSync.mockReturnValue(false);
      const result = await saveConfig({ agent: "claude" });
      expect(result.success).toBe(true);
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it("includes per-field warnings for each missing field", async () => {
      mockedExistsSync.mockReturnValue(false);
      const result = await saveConfig({});
      const warnings = result.warnings?.join(" ") ?? "";
      expect(warnings).toContain("-a");
      expect(warnings).toContain("-k");
      expect(warnings).toContain("-m");
    });

    it("merges with existing config on disk", async () => {
      mockedExistsSync
        .mockReturnValueOnce(true) // CONFIG_PATH exists → readConfig reads it
        .mockReturnValueOnce(true); // HOME_DIR exists → no mkdir
      mockedReadFile.mockResolvedValue(
        JSON.stringify({ agent: "claude", model: "old-model" }) as any,
      );
      await saveConfig({ model: "new-model", apikey: "key", agent: "claude" });
      const written = JSON.parse(
        mockedWriteFile.mock.calls[0][1] as string,
      );
      expect(written.model).toBe("new-model");
      expect(written.agent).toBe("claude");
    });

    it("creates HOME_DIR when it does not exist", async () => {
      mockedExistsSync
        .mockReturnValueOnce(false) // CONFIG_PATH: no existing config
        .mockReturnValueOnce(false); // HOME_DIR: does not exist
      await saveConfig({ agent: "claude", apikey: "key", model: "model" });
      expect(mockedMkdir).toHaveBeenCalled();
    });

    it("skips mkdir when HOME_DIR already exists", async () => {
      mockedExistsSync
        .mockReturnValueOnce(false) // CONFIG_PATH
        .mockReturnValueOnce(true); // HOME_DIR exists
      await saveConfig({ agent: "claude", apikey: "key", model: "model" });
      expect(mockedMkdir).not.toHaveBeenCalled();
    });

    it("ignores undefined values when merging", async () => {
      mockedExistsSync.mockReturnValue(false);
      await saveConfig({
        agent: "claude",
        apikey: "key",
        model: "model",
        lang: undefined,
      });
      const written = JSON.parse(
        mockedWriteFile.mock.calls[0][1] as string,
      );
      expect(written).not.toHaveProperty("lang");
    });
  });
});
