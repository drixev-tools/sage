export type Agents = "claude" | "openai";

export interface Config {
  agent?: Agents;
  apikey?: string;
  model?: string;
  lang?: string;
  timeout?: number;
  maxRetries?: number;
}
