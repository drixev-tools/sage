import { homedir } from "os";
import { join } from "path";

export const APPNAME = "sage";
export const HOME_DIR = join(homedir(), ".config", APPNAME);
export const AGENTS_SUPPORTED = ["claude", "openai", "ollama"];
export const LANGUAGES_SUPPORTED = ["en", "es"];
export const FALLBACK_DIFF_BUDGET = 8_000;

export const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".kt", ".swift",
  ".c", ".cpp", ".h", ".cs", ".php", ".rb",
  ".sh", ".bash", ".yaml", ".yml", ".toml", ".sql",
  ".vue", ".svelte",
]);
