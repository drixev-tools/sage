#!/usr/bin/env node
import { Command } from "commander";
import { registerAuthCommand } from "../commands/auth";
import { registerCommitCommand } from "../commands/commit";
import { registerSummaryCommand } from "../commands/summary";
import { registerRiskCommand } from "../commands/risk";
import { APPNAME } from "../lib/constants";
import { registerConfigCommand } from "../commands/config";

import { homedir } from "os";

const program = new Command();

program
  .name(APPNAME)
  .description(
    "IA-powered git assistant - smarter commits, PR summaries and code review",
  )
  .version("0.1.0");

// MODELS AVAILABLE
// # CLAUDE
// # GPT

console.log(`PATH CONFIG: ${homedir()}`);

registerAuthCommand(program);
registerConfigCommand(program);
registerCommitCommand(program);
registerSummaryCommand(program);
registerRiskCommand(program);
//stats

program.parse();
