import { existsSync } from "fs";
import { join } from "path";
import { Config } from "../types/config.types";
import { AGENTS_SUPPORTED, APPNAME, HOME_DIR } from "../lib/constants";
import { mkdir, writeFile, readFile } from "fs/promises";

const CONFIG_PATH = join(HOME_DIR, "config.json");

async function readConfig(): Promise<Config> {
  if (!existsSync(CONFIG_PATH)) return {};

  try {
    return JSON.parse(await readFile(CONFIG_PATH, { encoding: "utf-8" })) as Config;
  } catch {
    return {};
  }
}

async function writeConfig(config: Config): Promise<void> {
  if (!existsSync(HOME_DIR)) {
    await mkdir(HOME_DIR, { recursive: true });
  }

  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 384,
  });
}

export async function saveConfig(updConfig: Config): Promise<{
  success: boolean;
  warnings?: string[];
  error?: string;
}> {
  const config = await readConfig();

  const existsApiKey = updConfig.apikey || config.apikey;
  const existsAgent = updConfig.agent || config.agent;
  const existsModel = updConfig.model || config.model;
  const existsUrl = updConfig.url || config.url;

  const agent = updConfig.agent || config.agent || "ollama";

  if (existsAgent && !AGENTS_SUPPORTED.includes(agent)) {
    return {
      success: false,
      error:
        "Sorry. Your IA agent is not supported yet. Try with 'claude' or 'openai'. By default we use 'claude'",
    };
  }

  const warnings: string[] = [];

  if (!existsAgent || !existsApiKey || !existsModel) {
    warnings.push(
      `You need to set first your environment. Set your API Key, IA agent and model before use ${APPNAME}.\n`,
    );

    if (!existsAgent) warnings.push(`\t-a : agent is required\n`);
    if (!existsApiKey) warnings.push(`\t-k : apikey is required\n`);
    if (!existsModel) warnings.push(`\t-m : model is required\n`);
  }

  if (agent === "ollama" && !existsUrl) {
    return {
      success: false,
      error: "To use Ollama you need to add the url value",
      warnings,
    };
  }

  const newConfig = {
    ...config,
    ...Object.fromEntries(
      Object.entries(updConfig)
        .filter(([_, val]) => val !== undefined)
        .map(([key, value]) => [key, value]),
    ),
  };

  await writeConfig(newConfig);
  return {
    success: true,
    warnings,
  };
}

export async function getApiKey(): Promise<string | undefined> {
  return (await readConfig()).apikey;
}

export async function getConfig(): Promise<Config> {
  return await readConfig();
}
