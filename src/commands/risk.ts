import { Command, Option } from "commander";
import {
  getChangedFiles,
  getGitDiff,
  getGitDiffPerFile,
  isInsideGitRepo,
} from "../lib/git-helpers";
import chalk from "chalk";
import { APPNAME } from "../lib/constants";
import ora from "ora";
import { checkRiskChanges, suggestSummaryOf } from "../services/ai.service";
import { RiskSummary } from "../types/risk.types";
import { generateDoc } from "../services/file.service";

export function registerRiskCommand(program: Command) {
  program
    .command("risk")
    .addOption(
      new Option(
        "-g, --generate",
        "Generate a readme document for the report",
      ).default(true),
    )
    .addOption(
      new Option(
        "-c, --console",
        "Print the analize risk report in the console",
      ).default(false),
    )
    .action(async (options: { generate: Boolean; console: boolean }) => {
      if (!isInsideGitRepo()) {
        console.error(chalk.red("Not inside a Git repository\n"));
        process.exit();
      }

      const diff = getGitDiff();

      if (!diff.trim()) {
        console.error(chalk.yellow("Not staged changes found\n"));
        console.log(
          chalk.dim(`Run: git add <files> before use ${APPNAME} commitn\n`),
        );
        process.exit(0);
      }

      const spinner = ora("Analizing your changes...").start();
      try {
        const files = getChangedFiles();

        const summary: RiskSummary[] = [];

        spinner.info("Generating the summary...");
        for (const file of files) {
          const diffFile = getGitDiffPerFile(file);

          const message = await checkRiskChanges(diffFile);
          summary.push({ file, message: JSON.parse(message) });
        }

        const message = await suggestSummaryOf(summary);

        if (options.console) {
          console.log(chalk.cyan.bold("\nAnalize:\n"));
          console.log(chalk.cyan(message));
        }

        if (options.generate) {
          await generateDoc(message);
        }

        spinner.succeed("Summary message ready!");
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
