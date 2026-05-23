import { Command } from "commander";
import {
  commitMessage,
  getChangedFiles,
  getChangedFilesCount,
  getCurrentRepo,
  getGitDiffPerFile,
  getGitDiffStat,
  isInsideGitRepo,
} from "../lib/git.helpers";
import chalk from "chalk";
import ora from "ora";
import { suggestCommitMessageFromContext } from "../services/ai.service";
import { saveCommit } from "../services/db.service";
import { APPNAME, FALLBACK_DIFF_BUDGET } from "../lib/constants";
import { printSuccessChalk, printTitleChalk } from "../lib/print.helpers";

export function registerCommitCommand(program: Command): void {
  program
    .command("commit")
    .description(
      "Generate a conventional commit message from your staged changes",
    )
    .option("-y, --yes", "Commit immediately without confirmation")
    .action(async (options: { yes: boolean }) => {
      if (!isInsideGitRepo()) {
        console.error(chalk.red("Not inside a Git repository\n"));
        process.exit();
      }

      const files = getChangedFiles();
      if (files.length === 0) {
        console.error(chalk.yellow("No staged changes found\n"));
        console.log(
          chalk.dim(`Run: git add <files> before use ${APPNAME} commit\n`),
        );
        process.exit(0);
      }

      const spinner = ora("Analyzing your changes...").start();
      try {
        const stat = getGitDiffStat();
        const fileDiffs = files.map((f) => getGitDiffPerFile(f));
        fileDiffs.sort((a, b) => b.length - a.length);

        let topDiff = "";
        for (const fd of fileDiffs) {
          if (topDiff.length + fd.length > FALLBACK_DIFF_BUDGET) break;
          topDiff += fd;
        }

        spinner.info("Generating commit message...");
        const message = await suggestCommitMessageFromContext(stat, topDiff);

        spinner.succeed("Commit message ready!");

        console.log(printTitleChalk("Suggested commit"));
        console.log("\t" + chalk.cyan(message) + "\n");

        if (options.yes) {
          spinner.info("Commiting using the suggested message...");
          const committed = commitMessage(message);

          if (!committed) {
            console.log(chalk.red("Commit fails!. Try again!."));
            process.exit(1);
          }

          spinner.succeed("Commit succefully!");

          await saveCommit({
            repo: getCurrentRepo(),
            message,
            filesChanged: getChangedFilesCount(),
          });

          console.log(printSuccessChalk("Committed!"));
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
