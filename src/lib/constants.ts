import { homedir } from "os";
import { join } from "path";

export const APPNAME = "muse-node";
export const HOME_DIR = join(homedir(), ".config", APPNAME);
export const AGENTS_SUPPORTED = ["claude", "openai"];
export const LANGUAGES_SUPPORTED = ["en", "es"];
