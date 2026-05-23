import OpenAI from "openai";
import { Config } from "../../types/config.types";
import { removeJsonTag, removeJump } from "../../lib/git.helpers";
import { ChatCompletionMessageParam } from "openai/resources";

type MessageIARequest = {
  messages: { role: string; content: string }[];
  max_tokens?: number;
  removeJumpLine?: boolean;
};

export class openaiAgent {
  private _config: Config = {};
  constructor(config: Config) {
    this._config = config;
  }

  private getopenaiClient() {
    if (this._config.url) {
      try {
        new URL(this._config.url);
      } catch {
        throw new Error(`Invalid base URL: "${this._config.url}"`);
      }
    }

    return new OpenAI({
      baseURL: this._config.url,
      apiKey: this._config.apikey,
      timeout: this._config.timeout,
      maxRetries: this._config.maxRetries,
    });
  }

  async createOpenaiRequest(request: MessageIARequest) {
    if (!this._config.model) {
      throw new Error("Model is required for OpenAI requests");
    }

    const message = await this.getopenaiClient().responses.create({
      model: this._config.model,
      input: request.messages[0].content,
      max_output_tokens: request.max_tokens,
    });

    const result = removeJsonTag(message.output_text);
    return request.removeJumpLine ? removeJump(result) : result;
  }

  async createOllamaRequest(request: MessageIARequest) {
    if (!this._config.model) {
      throw new Error("Model is required for OpenAI requests");
    }

    const message = await this.getopenaiClient().chat.completions.create({
      model: this._config.model,
      messages: request.messages as ChatCompletionMessageParam[],
    });

    const result = removeJsonTag(message.choices[0].message.content || "");

    let output = result;
    if (result.includes("response")) {
      output = (JSON.parse(result) as { response: string }).response;
    }

    return request.removeJumpLine ? removeJump(output) : output;
  }
}
