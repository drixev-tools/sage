import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { APPNAME } from "../lib/constants";
import { isInsideGitRepo, getGitDiffPerFile } from "../lib/git-helpers";
import { reviewChanges } from "../services/ai.service";
import { generateDoc } from "../services/file.service";

export function registerReviewCommand(program: Command) {
  program
    .command("review")
    .description("Generate an AI review for a specific file")
    .addOption(
      new Option(
        "-g, --generate [generate]",
        "Generate a readme document for the report",
      )
        .choices(["true", "false"])
        .default(false),
    )
    .addOption(
      new Option(
        "-c, --console [console]",
        "Print the analize risk report in the console",
      )
        .choices(["true", "false"])
        .default(true),
    )
    .option("-f, --file <file>", "Path of the file to be analized")
    .action(
      async (options: {
        generate: boolean;
        console: boolean;
        file: string;
      }) => {
        if (!isInsideGitRepo()) {
          console.error(chalk.red("Not inside a Git repository\n"));
          process.exit();
        }

        if (!options.file) {
          console.error(
            chalk.red(
              "You MUST specify the path of the file before use this command",
            ),
          );
          process.exit(1);
        }

        const spinner = ora("Analizing your changes...").start();
        try {
          const diff = getGitDiffPerFile(options.file);

          if (!diff.trim()) {
            console.error(chalk.yellow("Not staged changes found\n"));
            console.log(
              chalk.dim(`Run: git add <files> before use ${APPNAME} commitn\n`),
            );
            process.exit(0);
          }

          spinner.info("Reviewing your changes...");

          const message = await reviewChanges(diff);

          if (options.console) {
            console.log(chalk.cyan.bold("\nAnalize:\n"));
            console.log(chalk.cyan(message));
          }

          if (options.generate) {
            const destinyPath = await generateDoc(message, "review");
            console.info(chalk.greenBright(`[Path]: ${destinyPath}`));
          }

          spinner.succeed("Summary message ready!");
        } catch (error) {
          spinner.fail("Something went wrong");
          console.error(chalk.red((error as Error).message));
          process.exit(1);
        }
      },
    );
}
