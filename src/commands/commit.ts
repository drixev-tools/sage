import { Command } from "commander";
import {
  commitMessage,
  getChangedFiles,
  getChangedFilesCount,
  getCurrentRepo,
  getGitDiff,
  getGitDiffPerFile,
  isInsideGitRepo,
} from "../lib/git-helpers";
import chalk from "chalk";
import ora from "ora";
import {
  generateSummaryOfCommits,
  suggestCommitMessage,
} from "../services/ai.service";
import { saveCommit } from "../services/db.service";
import { APPNAME } from "../lib/constants";

export function registerCommitCommand(program: Command): void {
  program
    .command("commit")
    .description("Generate an AI commit message from your staged changes")
    .option("-y, --yes", "Commit immediately without confirmation")
    .action(async (options: { yes: boolean }) => {
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
        spinner.info("Getting your changes...");
        const files = getChangedFiles();

        const CONCURRENCY = 3;
        const summary: string[] = [];

        for (let i = 0; i < files.length; i += CONCURRENCY) {
          const batch = files.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.all(
            batch.map((file) => suggestCommitMessage(getGitDiffPerFile(file))),
          );
          summary.push(...batchResults);
        }

        spinner.info("Generating the summary...");
        const message = await generateSummaryOfCommits(summary);
        spinner.succeed("Commit message ready!");

        console.log(chalk.bold("\nSuggested commit:\n"));
        console.log(chalk.cyan(`\t${message}\n`));

        if (options.yes) {
          spinner.info("Commiting using the suggested message...");
          const committed = commitMessage(message);

          if (!committed) {
            console.log(chalk.red("Commit fails!. Try again!."));
            process.exit(1);
          }

          spinner.info("Commit succefully!");

          saveCommit({
            repo: getCurrentRepo(),
            message,
            filesChanged: getChangedFilesCount(),
          });

          console.log(chalk.green("\n Committed!\n"));
        } else {
          console.log(
            chalk.dim(
              " Use --yes to commit directly, or copy and paste the message above.\n",
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
