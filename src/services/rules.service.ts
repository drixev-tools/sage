import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { RulesConfig } from "../types/rules.types";
import { HOME_DIR } from "../lib/constants";

const RULES_PATH = join(HOME_DIR, "rules.json");

export const DEFAULT_RULES: RulesConfig = {
  sourceExtensions: [
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".go", ".rs", ".java", ".kt", ".swift",
    ".c", ".cpp", ".h", ".cs", ".php", ".rb",
    ".sh", ".bash", ".yaml", ".yml", ".toml", ".sql",
    ".vue", ".svelte",
  ],
  noisePatterns: [
    "pnpm-lock\\.yaml$",
    "package-lock\\.json$",
    "yarn\\.lock$",
    "bun\\.lock$",
    "Cargo\\.lock$",
    "poetry\\.lock$",
    "go\\.sum$",
    "composer\\.lock$",
    "Gemfile\\.lock$",
    "funding\\.yml$",
    "\\.github/(?!workflows/).+\\.ya?ml$",
  ],
};

export function getRulesFilePath(): string {
  return RULES_PATH;
}

export function rulesFileExists(): boolean {
  return existsSync(RULES_PATH);
}

export async function readRules(): Promise<RulesConfig> {
  if (!existsSync(RULES_PATH)) return { ...DEFAULT_RULES };

  try {
    const raw = await readFile(RULES_PATH, { encoding: "utf-8" });
    const parsed = JSON.parse(raw) as Partial<RulesConfig>;
    return {
      sourceExtensions:
        Array.isArray(parsed.sourceExtensions) && parsed.sourceExtensions.length
          ? parsed.sourceExtensions
          : DEFAULT_RULES.sourceExtensions,
      noisePatterns:
        Array.isArray(parsed.noisePatterns) && parsed.noisePatterns.length
          ? parsed.noisePatterns
          : DEFAULT_RULES.noisePatterns,
    };
  } catch {
    return { ...DEFAULT_RULES };
  }
}

export async function writeRules(rules: RulesConfig): Promise<string> {
  if (!existsSync(HOME_DIR)) {
    await mkdir(HOME_DIR, { recursive: true });
  }

  await writeFile(RULES_PATH, JSON.stringify(rules, null, 2), { encoding: "utf-8" });
  return RULES_PATH;
}

export async function ensureRules(): Promise<{
  rules: RulesConfig;
  created: boolean;
  path: string;
}> {
  if (existsSync(RULES_PATH)) {
    const rules = await readRules();
    return { rules, created: false, path: RULES_PATH };
  }

  await writeRules(DEFAULT_RULES);
  return { rules: { ...DEFAULT_RULES }, created: true, path: RULES_PATH };
}
