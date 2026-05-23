#!/usr/bin/env node

// Suppress Node.js experimental warnings (node:sqlite is experimental in Node 22)
process.removeAllListeners("warning");

import { Command } from "commander";
import { registerAuthCommand } from "../commands/auth";
import { registerCommitCommand } from "../commands/commit";
import { registerSummaryCommand } from "../commands/summary";
import { registerRiskCommand } from "../commands/risk";
import { APPNAME } from "../lib/constants";
import { registerConfigCommand } from "../commands/config";

import { registerReviewCommand } from "../commands/review";
import { registerStatsCommand } from "../commands/stats";
import { registerDailyCommand } from "../commands/daily";

const program = new Command();

program
  .name(APPNAME)
  .description(
    "AI-powered Git assistant CLI — smarter commits, PR summaries, code reviews & risk analysis",
  )
  .version("0.1.0");

registerAuthCommand(program);
registerConfigCommand(program);
registerCommitCommand(program);
registerSummaryCommand(program);
registerRiskCommand(program);
registerReviewCommand(program);
registerStatsCommand(program);
registerDailyCommand(program);

program.parse();
