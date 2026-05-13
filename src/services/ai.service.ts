import { getConfig } from "./config.service";
import { IAAgent } from "../providers";
import {
  getCommitMessage,
  getSummaryOf,
  getReviewMessage,
  getRiskSummary,
  getSummaryMessage,
} from "../lib/ia-messages";

async function getLanguage(): Promise<string> {
  const { lang } = await getConfig();
  return lang ?? "es";
}

export async function suggestCommitMessage(diff: string): Promise<string> {
  const client = new IAAgent(await getConfig());
  const message = await client.create({
    max_tokens: 256,
    message: getCommitMessage(diff, await getLanguage()),
  });

  return message;
}

export async function suggestSummaryOf<T>(observations: T[]): Promise<string> {
  const client = new IAAgent(await getConfig());
  const message = await client.create({
    max_tokens: 1024,
    message: getSummaryOf(observations, await getLanguage()),
  });
  return message;
}

export async function generatePRSummary(commits: string[]): Promise<string> {
  const client = new IAAgent(await getConfig());
  const message = await client.create({
    max_tokens: 512,
    message: getSummaryMessage(commits, await getLanguage()),
  });

  return message;
}

export async function reviewChanges(diff: string): Promise<string> {
  const client = new IAAgent(await getConfig());
  const message = await client.create({
    max_tokens: 512,
    message: getReviewMessage(diff, await getLanguage()),
  });

  return message;
}

export async function checkRiskChanges(diff: string): Promise<string> {
  const client = new IAAgent(await getConfig());
  const message = await client.create({
    max_tokens: 2048,
    message: getRiskSummary(diff, await getLanguage()),
    removeJumpLine: true
  });

  return message;
}
