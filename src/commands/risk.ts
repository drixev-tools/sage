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
import { checkRiskChanges, suggestSummaryOfRisk } from "../services/ai.service";
import { RiskDetail } from "../types/risk.types";
import { generateDoc } from "../services/file.service";

export function registerRiskCommand(program: Command) {
  program
    .command("risk")
    .description("Generate an AI summary of risks about your changes")
    .addOption(
      new Option(
        "-g, --generate [generate]",
        "Generate a readme document for the report",
      )
        .choices(["true", "false"])
        .default(false),
    )
    .addOption(
      new Option(
        "-c, --console [console]",
        "Print the analize risk report in the console",
      )
        .choices(["true", "false"])
        .default(true),
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

        spinner.info("Generating the summary...");

        const CONCURRENCY = 3;
        const results: { file: string; message: string }[] = [];

        for (let i = 0; i < files.length; i += CONCURRENCY) {
          const batch = files.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.all(
            batch.map((file) =>
              checkRiskChanges(file, getGitDiffPerFile(file)),
            ),
          );
          results.push(...batchResults);
        }

        const summary: RiskDetail[] = results.map((result) => ({
          file: result.file,
          message: JSON.parse(result.message),
        }));

        const message = await suggestSummaryOfRisk(summary);

        if (options.console) {
          console.log(chalk.cyan.bold("\nAnalize:\n"));
          console.log(chalk.cyan(message));
        }

        if (options.generate) {
          const destinyPath = await generateDoc(message, "risk");
          console.info(chalk.greenBright(`[Path]: ${destinyPath}`));
        }

        spinner.succeed("Summary message ready!");
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
