import { describe, it, expect } from "vitest";
import {
  APPNAME,
  HOME_DIR,
  AGENTS_SUPPORTED,
  LANGUAGES_SUPPORTED,
  FALLBACK_DIFF_BUDGET,
  SOURCE_EXTENSIONS,
} from "../../lib/constants";

describe("constants", () => {
  it('APPNAME is "sage"', () => {
    expect(APPNAME).toBe("sage");
  });

  it("AGENTS_SUPPORTED includes all providers", () => {
    expect(AGENTS_SUPPORTED).toContain("claude");
    expect(AGENTS_SUPPORTED).toContain("openai");
    expect(AGENTS_SUPPORTED).toContain("ollama");
    expect(AGENTS_SUPPORTED).toHaveLength(3);
  });

  it("LANGUAGES_SUPPORTED includes en and es", () => {
    expect(LANGUAGES_SUPPORTED).toContain("en");
    expect(LANGUAGES_SUPPORTED).toContain("es");
    expect(LANGUAGES_SUPPORTED).toHaveLength(2);
  });

  it("FALLBACK_DIFF_BUDGET is 8000", () => {
    expect(FALLBACK_DIFF_BUDGET).toBe(8_000);
  });

  it("SOURCE_EXTENSIONS is a Set with common file types", () => {
    expect(SOURCE_EXTENSIONS).toBeInstanceOf(Set);
    expect(SOURCE_EXTENSIONS.has(".ts")).toBe(true);
    expect(SOURCE_EXTENSIONS.has(".tsx")).toBe(true);
    expect(SOURCE_EXTENSIONS.has(".js")).toBe(true);
    expect(SOURCE_EXTENSIONS.has(".jsx")).toBe(true);
    expect(SOURCE_EXTENSIONS.has(".py")).toBe(true);
    expect(SOURCE_EXTENSIONS.has(".go")).toBe(true);
    expect(SOURCE_EXTENSIONS.has(".rs")).toBe(true);
    expect(SOURCE_EXTENSIONS.has(".md")).toBe(false);
    expect(SOURCE_EXTENSIONS.has(".txt")).toBe(false);
  });

  it('HOME_DIR contains "sage"', () => {
    expect(HOME_DIR).toContain("sage");
  });
});
