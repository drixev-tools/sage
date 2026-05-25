import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  ensureRules,
  readRules,
  writeRules,
  DEFAULT_RULES,
  getRulesFilePath,
  rulesFileExists,
} from "../services/rules.service";
import { printTitleChalk } from "../lib/print.helpers";
import { APPNAME } from "../lib/constants";

export function registerRulesCommand(program: Command): void {
  program
    .command("rules")
    .description(
      "Manage ~/.config/sage/rules.json — controls which files are included in analysis",
    )
    .option(
      "--generate",
      "Create rules.json with default values (no-op if already exists)",
    )
    .option(
      "--reset",
      "Overwrite rules.json with the built-in default rules",
    )
    .action(async (options: { generate: boolean; reset: boolean }) => {
      const spinner = ora("Loading rules...").start();

      try {
        if (options.reset) {
          const filePath = await writeRules(DEFAULT_RULES);
          spinner.succeed("Rules reset to built-in defaults!");
          console.log(chalk.dim(`  File: ${filePath}\n`));
          return;
        }

        if (options.generate) {
          if (rulesFileExists()) {
            spinner.info(`Rules file already exists — no changes made.`);
            console.log(chalk.dim(`  File: ${getRulesFilePath()}`));
            console.log(
              chalk.dim(`  Run: ${APPNAME} rules --reset to restore defaults.\n`),
            );
            return;
          }

          const { path: filePath } = await ensureRules();
          spinner.succeed("Rules file created with default values!");
          console.log(chalk.dim(`  File: ${filePath}\n`));
          return;
        }

        const rules = await readRules();
        spinner.succeed("Current rules\n");

        console.log(printTitleChalk("Source Extensions"));
        rules.sourceExtensions.forEach((ext) => {
          console.log(chalk.cyan(`  ${ext}`));
        });

        console.log("\n" + printTitleChalk("Noise Patterns  (always excluded)"));
        rules.noisePatterns.forEach((p) => {
          console.log(chalk.dim(`  ${p}`));
        });

        const filePath = getRulesFilePath();
        if (rulesFileExists()) {
          console.log(chalk.dim(`\n  Loaded from: ${filePath}`));
        } else {
          console.log(
            chalk.yellow(
              `\n  Using built-in defaults — no rules.json found at ${filePath}.\n` +
                `  Run: ${APPNAME} rules --generate  to create it.\n`,
            ),
          );
        }
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
