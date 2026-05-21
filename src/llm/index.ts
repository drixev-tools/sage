import { Agents, Config } from "../types/config.types";
import { openaiAgent } from "./providers/openai";
import { IAClaudeAgent } from "./providers/claude";
import { APPNAME } from "../lib/constants";

export class IAAgent {
  private _config: Config = {};
  private _provider: Agents = "claude";

  constructor(config: Config) {
    this._config = config;
    this._provider = config.agent ?? "claude";
  }

  private getIAClient() {
    if (!this._config.apikey) {
      console.error(`Not API key found. Run: ${APPNAME} auth set <your-key>`);
      process.exit(1);
    }

    if (!this._config.model) {
      console.error(
        `\n Model is required, please add one before use ${APPNAME} \n`,
      );
      process.exit(1);
    }

    switch (this._provider) {
      case "ollama":
      case "openai":
        return new openaiAgent(this._config);
      case "claude":
      default:
        return new IAClaudeAgent(this._config);
    }
  }

  create(options: {
    message: string;
    max_tokens: number;
    removeJumpLine?: boolean;
  }) {
    switch (this._provider) {
      case "ollama":
        return (this.getIAClient() as openaiAgent).createOllamaRequest({
          messages: [{ role: "user", content: options.message }],
          max_tokens: options.max_tokens,
          removeJumpLine: options.removeJumpLine,
        });
      case "openai":
        return (this.getIAClient() as openaiAgent).createOpenaiRequest({
          messages: [{ role: "user", content: options.message }],
          max_tokens: options.max_tokens,
          removeJumpLine: options.removeJumpLine,
        });
      case "claude":
      default:
        return (this.getIAClient() as IAClaudeAgent).createClaudeRequest(
          options.message,
          options.max_tokens,
          options.removeJumpLine,
        );
    }
  }
}
