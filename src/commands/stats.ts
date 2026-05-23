import { Command } from "commander";
import ora from "ora";
import { getStats } from "../services/db.service";
import chalk from "chalk";
import {
  printLabelAndDetailChalk,
  printTitleChalk,
} from "../lib/print.helpers";

export function registerStatsCommand(program: Command) {
  program
    .command("stats")
    .description("Shows your local commit history tracked by sage.")
    .action(async () => {
      const spinner = ora("Generating the stats...").start();
      try {
        const stats = await getStats();

        spinner.info("Stats generated!");

        console.info(
          printTitleChalk(`Total Commits: ${stats.totalCommits}`),
        );

        console.info(
          printTitleChalk(`Total Types: [${stats.topTypes.length}]`),
        );

        console.info(chalk.yellow(`\t${"-".repeat(45)}`));

        stats.topTypes.forEach((tp) => {
          console.info(printLabelAndDetailChalk("Type: ", tp.type));
          console.info(printLabelAndDetailChalk("Count: ", `${tp.count}`));
          console.info(chalk.yellow(`\t${"-".repeat(45)}`));
        });

        console.info(
          printTitleChalk(`Recent Commits: [${stats.recentCommits.length}]`),
        );

        stats.recentCommits.forEach((rc) => {
          console.info(printLabelAndDetailChalk("Message", rc.message));
          console.info(printLabelAndDetailChalk("Repository", rc.repo));
          console.info(printLabelAndDetailChalk("Created At", rc.created_at));

          console.info(chalk.yellow(`\t${"-".repeat(45)}`));
        });
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
