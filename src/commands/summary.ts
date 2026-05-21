import { Command } from "commander";
import { getRecentCommits, isInsideGitRepo } from "../lib/git.helpers";
import chalk from "chalk";
import ora from "ora";
import { generatePRSummary } from "../services/ai.service";
import { generateDoc } from "../services/file.service";

export function registerSummaryCommand(program: Command) {
  program
    .command("summary")
    .description("Generate a Pull Request description from your recent commits")
    .option("-n, --number <n>", "Number of recent commits to analyze", "10")
    .option("-g, --generate", "Save the summary to a markdown file")
    .action(async (options: { number: string; generate: boolean }) => {
      if (!isInsideGitRepo()) {
        console.error(chalk.red("Not inside a Git repository\n"));
        process.exit(1);
      }

      const n = parseInt(options.number, 10);
      if (isNaN(n) || n < 1) {
        console.error(chalk.red("--number must be a positive integer\n"));
        process.exit(1);
      }

      const commits = getRecentCommits(n);

      if (!commits.length) {
        console.warn(chalk.yellow("No commits found"));
        process.exit(1);
      }

      const spinner = ora(`Analyzing last ${n} commit(s)...`).start();

      try {
        const message = await generatePRSummary(commits);
        spinner.succeed("Summary ready!\n");

        console.log(chalk.bold.cyan("── PR Summary " + "─".repeat(48) + "\n"));
        console.log(chalk.white(message));
        console.log();

        if (options.generate) {
          const destinyPath = await generateDoc(message, "summary");
          console.info(chalk.greenBright(`[Report saved]: ${destinyPath}`));
        }
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
