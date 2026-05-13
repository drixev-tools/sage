import OpenAI from "openai";
import { Config } from "../types/config.types";
import { removeJsonTag, removeJump } from "../lib/git-helpers";

export class openaiAgent {
  private _config: Config = {};
  constructor(config: Config) {
    this._config = config;
  }

  private getopenaiClient() {
    const client = new OpenAI({
      apiKey: this._config.apikey,
      timeout: this._config.timeout,
      maxRetries: this._config.maxRetries,
    });

    return client;
  }

  async createopenaiRequest(content: string, max_tokens?: number, removeJumpLine?: boolean) {
    const message = await this.getopenaiClient().responses.create({
      model: this._config.model,
      input: content,
      max_output_tokens: max_tokens,
    });

    console.log({openaimessage: message});
    const result = removeJsonTag(message.output_text);
    return removeJumpLine ? removeJump(result) : result;
  }
}
