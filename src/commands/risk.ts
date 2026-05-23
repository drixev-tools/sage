import { Command } from "commander";
import {
  getChangedFiles,
  getAllChangedFileNames,
  getGitDiffPerFile,
  getWorkingTreeDiffPerFile,
  getAllTrackedFiles,
  getFileContent,
  isInsideGitRepo,
} from "../lib/git.helpers";
import chalk from "chalk";
import { APPNAME } from "../lib/constants";
import ora from "ora";
import {
  checkRiskChanges,
  checkFileRisk,
  suggestSummaryOfRisk,
} from "../services/ai.service";
import { Mode, RiskDetail } from "../types/risk.types";
import { generateDoc } from "../services/file.service";
import {
  buildFullReport,
  printRiskTable,
  printFileRisk,
  printLabelAndDetailChalk,
  printTitleChalk,
} from "../lib/print.helpers";

export function registerRiskCommand(program: Command) {
  program
    .command("risk")
    .description(
      "Identify security vulnerabilities and operational risks in your codebase or changes",
    )
    .option(
      "--changes",
      "Analyze only current uncommitted changes (staged + unstaged)",
    )
    .option(
      "-s, --staged",
      "Analyze only staged changes (requires git add first)",
    )
    .option("-g, --generate", "Save the report to a markdown file")
    .action(
      async (options: {
        changes: boolean;
        staged: boolean;
        generate: boolean;
      }) => {
        if (!isInsideGitRepo()) {
          console.error(chalk.red("Not inside a Git repository\n"));
          process.exit(1);
        }

        const spinner = ora("Collecting files...").start();
        try {
          let files: string[];
          let mode: Mode;

          if (options.staged) {
            mode = "staged";
            files = getChangedFiles();
            if (!files.length) {
              spinner.warn("No staged changes found");
              console.log(
                chalk.dim(
                  `Run: git add <files> before using ${APPNAME} risk --staged\n`,
                ),
              );
              process.exit(0);
            }
          } else if (options.changes) {
            mode = "changes";
            files = getAllChangedFileNames();
            if (!files.length) {
              spinner.warn("No uncommitted changes found");
              console.log(
                chalk.dim(
                  "No tracked file changes detected in the working tree.\n",
                ),
              );
              process.exit(0);
            }
          } else {
            mode = "app";
            files = getAllTrackedFiles();
            if (!files.length) {
              spinner.warn("No tracked source files found");
              process.exit(0);
            }
          }

          const modeLabel =
            mode === "app"
              ? "whole codebase"
              : mode === "changes"
                ? "current changes"
                : "staged changes";

          const entries =
            mode === "app"
              ? files
                  .map((f) => ({ file: f, content: getFileContent(f) }))
                  .sort((a, b) => b.content.length - a.content.length)
              : files
                  .map((f) => ({
                    file: f,
                    content:
                      mode === "staged"
                        ? getGitDiffPerFile(f)
                        : getWorkingTreeDiffPerFile(f),
                  }))
                  .filter((e) => e.content.trim().length > 0)
                  .sort((a, b) => b.content.length - a.content.length);

          spinner.info(`Analyzing ${entries.length} file(s) [${modeLabel}]...`);

          const CONCURRENCY = 5;
          const rawResults: { file: string; message: string }[] = [];

          for (let i = 0; i < entries.length; i += CONCURRENCY) {
            const batch = entries.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(
              batch.map(({ file, content }) =>
                mode === "app"
                  ? checkFileRisk(file, content)
                  : checkRiskChanges(file, content),
              ),
            );
            rawResults.push(...batchResults);
          }

          const perFile: RiskDetail[] = rawResults
            .map((r) => {
              try {
                return {
                  file: r.file,
                  message: JSON.parse(r.message) as RiskDetail["message"],
                };
              } catch {
                return null;
              }
            })
            .filter((r): r is RiskDetail => r !== null);

          spinner.info("Generating overall summary...");
          const overallMessage = await suggestSummaryOfRisk(perFile);

          spinner.succeed("Risk analysis ready!\n");

          printRiskTable(perFile);

          const highlighted = perFile.filter(
            (d) => d.message.severity !== "low",
          );
          if (highlighted.length > 0) {
            console.log(printTitleChalk("Detailed Risks"));
            for (const detail of highlighted) {
              printFileRisk(detail);
            }
          }

          console.log(printTitleChalk('Overall Summary'));
          console.log(chalk.cyan(overallMessage));

          if (options.generate) {
            const fullReport = buildFullReport(perFile, overallMessage);
            const destinyPath = await generateDoc(fullReport, "risk");
            console.info(
              printLabelAndDetailChalk("[Report saved]", destinyPath),
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
