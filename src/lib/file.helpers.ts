import path from "path";
import { RulesConfig } from "../types/rules.types";
import { DEFAULT_RULES } from "../services/rules.service";

const TEST_FILE_PATTERN = /\.test\.(ts|js)$/;

export function isSourceFile(
  file: string,
  rules: RulesConfig = DEFAULT_RULES,
): boolean {
  const ext = path.extname(file).toLowerCase();
  if (!rules.sourceExtensions.includes(ext)) return false;
  return !rules.noisePatterns.some((p) => new RegExp(p, "i").test(file));
}

export function filterSourceFiles(
  files: string[],
  rules: RulesConfig = DEFAULT_RULES,
): { filtered: string[]; skipped: number } {
  const extSet = new Set(rules.sourceExtensions);
  const noiseRegexes = rules.noisePatterns.map((p) => new RegExp(p, "i"));

  const filtered = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    if (!extSet.has(ext)) return false;
    return !noiseRegexes.some((r) => r.test(f));
  });

  return { filtered, skipped: files.length - filtered.length };
}

export function filterTestFiles(files: string[]): {
  filtered: string[];
  skipped: number;
} {
  const filtered = files.filter((f) => !TEST_FILE_PATTERN.test(f));
  return { filtered, skipped: files.length - filtered.length };
}
