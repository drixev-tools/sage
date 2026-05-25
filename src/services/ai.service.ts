import { getConfig } from "./config.service";
import { IAAgent } from "../llm";
import {
  getCommitMessage,
  getCommitMessageFromContext,
  getReviewMessage,
  getSummaryRisks,
  getFileRisk,
  getSummaryOfRisk,
  getSummaryPRMessage,
  getDailyScrumMessage,
} from "../lib/prompts";
import { RiskDetail } from "../types/risk.types";
import { DailySpeach } from "../types/daily.types";

const MAX_RISK_INPUT_CHARS = 12_000;

function truncateRiskInput(content: string): string {
  if (content.length <= MAX_RISK_INPUT_CHARS) return content;
  return (
    content.slice(0, MAX_RISK_INPUT_CHARS) +
    "\n\n[... content truncated ...]"
  );
}

async function getLanguage(): Promise<string> {
  const { lang } = await getConfig();
  return lang ?? "en";
}

async function getClient(): Promise<IAAgent> {
  const config = await getConfig();
  return new IAAgent(config);
}

export async function suggestCommitMessage(diff: string): Promise<string> {
  const client = await getClient();
  const message = await client.create({
    max_tokens: 256,
    message: getCommitMessage(diff, await getLanguage()),
  });

  return message;
}

export async function suggestCommitMessageFromContext(
  stat: string,
  topDiff: string,
): Promise<string> {
  const client = await getClient();
  return client.create({
    max_tokens: 256,
    message: getCommitMessageFromContext(stat, topDiff, await getLanguage()),
  });
}

export async function generatePRSummary(commits: string[]): Promise<string> {
  const client = await getClient();
  const message = await client.create({
    max_tokens: 512,
    message: getSummaryPRMessage(commits, await getLanguage()),
  });

  return message;
}

export async function reviewChanges(diff: string): Promise<string> {
  const client = await getClient();
  const message = await client.create({
    max_tokens: 512,
    message: getReviewMessage(diff, await getLanguage()),
  });

  return message;
}

export async function checkRiskChanges(
  file: string,
  diff: string,
): Promise<{ file: string; message: string }> {
  const client = await getClient();
  const message = await client.create({
    max_tokens: 4096,
    message: getSummaryRisks(truncateRiskInput(diff), await getLanguage()),
    removeJumpLine: true,
  });

  return { file, message };
}

export async function checkFileRisk(
  file: string,
  content: string,
): Promise<{ file: string; message: string }> {
  const client = await getClient();
  const message = await client.create({
    max_tokens: 4096,
    message: getFileRisk(truncateRiskInput(content), file, await getLanguage()),
    removeJumpLine: true,
  });
  return { file, message };
}

export async function suggestSummaryOfRisk(
  observations: RiskDetail[],
): Promise<string> {
  const client = await getClient();
  const message = await client.create({
    max_tokens: 1024,
    message: getSummaryOfRisk(observations, await getLanguage()),
  });
  return message;
}

export async function suggestDailyReport(
  commits: string[],
): Promise<DailySpeach> {
  const client = await getClient();
  const response = await client.create({
    max_tokens: 512,
    message: getDailyScrumMessage(commits, await getLanguage()),
  });

  const report = JSON.parse(response) as DailySpeach;

  return report;
}
