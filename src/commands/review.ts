import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import {
  isInsideGitRepo,
  getGitDiff,
  getGitDiffPerFile,
  getAllChangedFileNames,
  getWorkingTreeDiffPerFile,
} from "../lib/git.helpers";
import { reviewChanges } from "../services/ai.service";
import { generateDoc } from "../services/file.service";
import { APPNAME } from "../lib/constants";
import {
  printLabelAndDetailChalk,
  printTitleChalk,
} from "../lib/print.helpers";

export function registerReviewCommand(program: Command) {
  program
    .command("review")
    .description(
      "Review code quality: readability, complexity, duplication and best practices",
    )
    .option("-f, --file <file>", "Review a specific file's staged diff")
    .option("--changes", "Review all uncommitted changes (staged + unstaged)")
    .option("-g, --generate", "Save the review to a markdown file")
    .action(
      async (options: {
        file?: string;
        changes: boolean;
        generate: boolean;
      }) => {
        if (!isInsideGitRepo()) {
          console.error(chalk.red("Not inside a Git repository\n"));
          process.exit(1);
        }

        const spinner = ora("Collecting changes...").start();
        try {
          let diff: string;
          let label: string;

          if (options.file) {
            diff = options.changes
              ? getWorkingTreeDiffPerFile(options.file)
              : getGitDiffPerFile(options.file);
            label = options.file;
          } else if (options.changes) {
            const files = getAllChangedFileNames();
            if (!files.length) {
              spinner.warn("No uncommitted changes found");
              console.log(
                chalk.dim(
                  "No tracked file changes detected in the working tree.\n",
                ),
              );
              process.exit(0);
            }
            const fileDiffs = files
              .map((f) => ({ file: f, diff: getWorkingTreeDiffPerFile(f) }))
              .filter((e) => e.diff.trim().length > 0)
              .sort((a, b) => b.diff.length - a.diff.length);
            diff = fileDiffs.map((e) => e.diff).join("\n");
            label = `${fileDiffs.length} changed file(s)`;
          } else {
            diff = getGitDiff();
            label = "staged changes";
          }

          if (!diff.trim()) {
            spinner.warn("No changes found to review");
            console.log(
              chalk.dim(
                `Run: git add <files> before using ${APPNAME} review, or pass --changes\n`,
              ),
            );
            process.exit(0);
          }

          spinner.info(`Reviewing ${label}...`);
          const message = await reviewChanges(diff);

          spinner.succeed("Review ready!\n");

          console.log(printTitleChalk("Code Review"));
          console.log(`${chalk.cyan(message)}\n`);

          if (options.generate) {
            const destinyPath = await generateDoc(message, "review");
            console.info(
              printLabelAndDetailChalk("[Report saved!]", destinyPath),
            );
          }
        } catch (error) {
          spinner.fail("Something went wrong");
          console.error(chalk.red((error as Error).message));
          process.exit(1);
        }
      },
    );
}
