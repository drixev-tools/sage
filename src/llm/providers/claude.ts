import Anthropic from "@anthropic-ai/sdk";
import { Config } from "../../types/config.types";
import { removeJsonTag, removeJump } from "../../lib/git.helpers";

export class IAClaudeAgent {
  private _config: Config = {};

  constructor(config: Config) {
    this._config = config;
  }

  getClaudeIAClient(): Anthropic {
    return new Anthropic({
      apiKey: this._config.apikey,
      timeout: this._config.timeout,
      maxRetries: this._config.maxRetries,
    });
  }

  async createClaudeRequest(
    content: string,
    max_tokens: number,
    removeJumpLine?: boolean,
  ) {
    let message: Anthropic.Messages.Message;
    try {
      message = await this.getClaudeIAClient().messages.create({
        model: this._config.model as string,
        max_tokens: max_tokens,
        messages: [{ role: "user", content }],
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Claude API request failed: ${detail}`);
    }

    const result = this.cleanContent(message);
    return removeJumpLine ? removeJump(result) : result;
  }

  cleanContent(message: Anthropic.Messages.Message): string {
    const block = message.content[0];

    return block.type === "text" ? removeJsonTag(block.text) : "";
  }
}
