export type Agents = "claude" | "openai" | "ollama";

export interface Config {
  url?: string;
  agent?: Agents;
  apikey?: string;
  model?: string;
  lang?: string;
  timeout?: number;
  maxRetries?: number;
}
