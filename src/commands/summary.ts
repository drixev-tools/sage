import { Command } from "commander";
import { getRecentCommits, isInsideGitRepo } from "../lib/git.helpers";
import chalk from "chalk";
import ora from "ora";
import { generatePRSummary } from "../services/ai.service";
import { generateDoc } from "../services/file.service";
import { printTitleChalk } from "../lib/print.helpers";

export function registerSummaryCommand(program: Command) {
  program
    .command("summary")
    .description("Generate a Pull Request description from your recent commits")
    .option("-c, --commits <n>", "Number of recent commits to analyze", "10")
    .option("-g, --generate", "Save the summary to a markdown file")
    .action(async (options: { commits: number; generate: boolean }) => {
      if (!isInsideGitRepo()) {
        console.error(chalk.red("Not inside a Git repository\n"));
        process.exit(1);
      }

      const n = options.commits;

      if (isNaN(n) || n < 1) {
        console.error(chalk.red("--commits must be a positive integer\n"));
        process.exit(1);
      }

      const spinner = ora(`Analyzing last ${n} commit(s)...`).start();
      const commits = getRecentCommits(n);

      if (!commits.length) {
        console.warn(chalk.yellow("No commits found"));
        process.exit(1);
      }

      try {
        const message = await generatePRSummary(commits);
        spinner.succeed("Summary ready!\n");

        console.log(printTitleChalk("PR Summary"));
        console.log(chalk.cyan(message));

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
