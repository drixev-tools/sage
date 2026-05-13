import { Command } from "commander";
import { getRecentCommits, isInsideGitRepo } from "../lib/git-helpers";
import chalk from "chalk";
import ora from "ora";
import { generatePRSummary } from "../services/ai.service";

export function registerSummaryCommand(program: Command) {
  program
    .command("summary")
    .description("Generate an AI summary message for your Pull Request")
    .option(
      "-n",
      "Total number of commits to Analize before generate the Summary",
    )
    .option("-r, --review", "Analyze critical issues in your changes")
    .action(async (options: { nodos: number; review: boolean }) => {
      if (!isInsideGitRepo()) {
        console.error(chalk.red("Not inside a Git repository\n"));
        process.exit(1);
      }

      const commits = getRecentCommits(options.nodos);

      if (!commits.length) {
        console.warn(chalk.yellow("No commits found"));
        process.exit(1);
      }

      const spinner = ora("Analizing your commits...").start();

      try {
        const message = await generatePRSummary(commits);
        spinner.succeed("Summary message ready");

        console.log(chalk.bold("Summary Suggested:\n"));
        console.log(chalk.cyan(`    ${message}\n`));

        console.log(chalk.green("\n Generated!\n"));
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
