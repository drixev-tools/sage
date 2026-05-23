import { Command } from "commander";
import { getRecentCommits, isInsideGitRepo } from "../lib/git.helpers";
import chalk from "chalk";
import ora from "ora";
import { suggestDailyReport } from "../services/ai.service";
import {
  printLabelAndDetailChalk,
  printTitleChalk,
} from "../lib/print.helpers";

export function registerDailyCommand(program: Command) {
  program
    .command("daily")
    .description(
      "Generate a suggestion for the daily Scrum meeting based on your latest changes",
    )
    .option("-c, --commits <n>", "Number of recent commits to analyze", "5")
    .action(async (options: { commits: number }) => {
      if (!isInsideGitRepo()) {
        console.error(chalk.red("Not inside a Git repository"));
        process.exit(1);
      }

      const n = options.commits;

      if (isNaN(n) || n < 1) {
        console.error(chalk.red("--commits must be a positive integer\n"));
        process.exit(1);
      }

      const spinner = ora("Analyzing your commits, wait...").start();
      const diff = getRecentCommits(n);

      try {
        spinner.info("Generating your report");
        const response = await suggestDailyReport(diff);

        spinner.info("Report ready!");

        console.log(printTitleChalk("Short"));
        console.log(printLabelAndDetailChalk("Label", response.short.label));
        console.log(
          printLabelAndDetailChalk("Yesterday", response.short.yesterday),
        );
        console.log(printLabelAndDetailChalk("Today", response.short.today));
        console.log(
          printLabelAndDetailChalk("Blockers", response.short.blockers),
        );

        console.log(printTitleChalk("Medium"));
        console.log(printLabelAndDetailChalk("Label", response.medium.label));
        console.log(
          printLabelAndDetailChalk("Yesterday", response.medium.yesterday),
        );
        console.log(printLabelAndDetailChalk("Today", response.medium.today));
        console.log(
          printLabelAndDetailChalk("Blockers", response.medium.blockers),
        );
      } catch (error) {
        process.exit(1);
      }
    });
}
