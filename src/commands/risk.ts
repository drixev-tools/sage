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
import { checkRiskChanges, checkFileRisk } from "../services/ai.service";
import { safeParseRiskMessage } from "../lib/json.helpers";
import { Mode, RiskDetail } from "../types/risk.types";
import { generateDoc } from "../services/file.service";
import {
  buildFullReport,
  printRiskTable,
  printFileRisk,
  printLabelAndDetailChalk,
  printTitleChalk,
} from "../lib/print.helpers";
import { filterSourceFiles, filterTestFiles } from "../lib/file.helpers";
import { ensureRules } from "../services/rules.service";

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
    .option(
      "-i, --ignoreTest",
      "Analyze only the source code, ignoring the '*.test.ts' files",
    )
    .option("-g, --generate", "Save the report to a markdown file")
    .action(
      async (options: {
        changes: boolean;
        staged: boolean;
        ignoreTest: boolean;
        generate: boolean;
      }) => {
        if (!isInsideGitRepo()) {
          console.error(chalk.red("Not inside a Git repository\n"));
          process.exit(1);
        }

        const spinner = ora("Collecting files...").start();
        try {
          const { rules, created, path: rulesPath } = await ensureRules();
          if (created) {
            console.log(
              chalk.dim(
                `\n  Rules file created at ${rulesPath}\n` +
                  `  Edit it to customise which extensions and noise patterns to use.\n` +
                  `  Run: ${APPNAME} rules to view or manage it.\n`,
              ),
            );
          }

          const extSet = new Set(rules.sourceExtensions);

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
            files = getAllTrackedFiles(extSet);
            if (!files.length) {
              spinner.warn("No tracked source files found");
              process.exit(0);
            }
          }

          {
            const { filtered, skipped } = filterSourceFiles(files, rules);
            files = filtered;
            if (!files.length) {
              spinner.warn(
                "No analyzable source files found after filtering noise",
              );
              process.exit(0);
            }
            if (skipped > 0) {
              console.log(
                chalk.dim(
                  `  Skipped ${skipped} non-source file(s) (lock files, metadata)`,
                ),
              );
            }
          }

          if (options.ignoreTest) {
            const { filtered, skipped } = filterTestFiles(files);
            files = filtered;
            if (!files.length) {
              spinner.warn(
                "No files left to analyze after ignoring test files",
              );
              process.exit(0);
            }
            if (skipped > 0) {
              console.log(
                chalk.dim(`  Skipped ${skipped} test file(s) (--ignoreTest)`),
              );
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

          entries.forEach((fileName) => {
            console.info(`\t` + chalk.dim(fileName.file));
          });

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

          const perFile: RiskDetail[] = rawResults.map((r) =>
            safeParseRiskMessage(r.message, r.file),
          );

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

          if (options.generate) {
            const fullReport = buildFullReport(perFile);
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
