import { Command } from "commander";
import ora from "ora";
import { getStats } from "../services/db.service";
import chalk from "chalk";

export function registerStatsCommand(program: Command) {
  program
    .command("stats")
    .description("Shows your local commit history tracked by sage.")
    .action(async () => {
      const spinner = ora("Generating the stats...").start();
      try {
        const stats = await getStats();

        spinner.info("Stats generated!");

        console.info(chalk.cyan(`Total Commits: ${stats.totalCommits}`));
        console.info(
          chalk.cyan(
            `\nTotal Types: ${stats.topTypes.length === 0 ? "[]" : ""}`,
          ),
        );
        console.info(chalk.cyan(`\t${"-".repeat(45)}`));
        stats.topTypes.forEach((tp) => {
          console.info(chalk.cyan(`\tType: ${tp.type}`));
          console.info(chalk.cyan(`\tCount: ${tp.count}`));
          console.info(chalk.cyan(`\t${"-".repeat(45)}`));
        });

        console.info(
          chalk.cyan(
            `\nRecent Commits: ${stats.recentCommits.length === 0 ? "[]" : ""}`,
          ),
        );
        console.info(chalk.cyan(`\t${"-".repeat(45)}`));
        stats.recentCommits.forEach((rc) => {
          console.info(chalk.cyan(`\tMessage: ${rc.message}`));
          console.info(chalk.cyan(`\tRepository: ${rc.repo}`));
          console.info(chalk.cyan(`\tCreated At: ${rc.created_at}`));
          console.info(chalk.cyan(`\t${"-".repeat(45)}`));
        });
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
