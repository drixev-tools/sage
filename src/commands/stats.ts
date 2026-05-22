import { Command } from "commander";
import ora from "ora";
import { getStats } from "../services/db.service";
import chalk from "chalk";

export function registerStatsCommand(program: Command) {
  program
    .command("stats")
    .description("Shows your local commit history tracked by sage: total commits, most used commit types, and recent activity.")
    .action(async () => {
      const spinner = ora("Generating the stats...").start();
      try {
        const stats = await getStats();

        spinner.info("Stats generated!");

        console.info(chalk.cyan(`Total Commits: ${stats.totalCommits}`));
        console.info(chalk.cyan(`Total Types:`));
        stats.topTypes.forEach((tp, index) => {
          if (index == 0) {
            console.info(chalk.cyan(`\t| Type    | Count |`));
            console.info(chalk.cyan(`\t--------------------`));
          }
          console.info(chalk.cyan(`\t| ${tp.type}    | ${tp.count} |`));
          console.info(chalk.cyan(`\t| -------------------- |`));
        });
        console.info(chalk.cyan(`Recent Commits:`));
        stats.recentCommits.forEach((rc, index) => {
          if (index == 0) {
            console.info(
              chalk.cyan(
                `\t| Message    \t\t\t| Repository\t\t | Created_At\t |`,
              ),
            );
            console.info(chalk.cyan(`\t| -------------------- |`));
          }
          console.info(
            chalk.cyan(
              `\t| ${rc.message}    \t\t\t| ${rc.repo}\t\t | ${rc.created_at}\t |`,
            ),
          );
          console.info(chalk.cyan(`\t| -------------------- |`));
        });
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
