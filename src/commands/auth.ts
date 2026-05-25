import { Command, Option } from "commander";
import { saveConfig } from "../services/config.service";
import { Config } from "../types/config.types";
import chalk from "chalk";
import ora from "ora";
import {
  AGENTS_SUPPORTED,
  APPNAME,
  LANGUAGES_SUPPORTED,
} from "../lib/constants";
import { printSuccessChalk, printTitleChalk } from "../lib/print.helpers";
import { ensureRules } from "../services/rules.service";

export function registerAuthCommand(program: Command): void {
  program
    .command("auth")
    .description(
      "Set up your AI provider, API key, model and language preferences",
    )
    .addOption(
      new Option(
        "-a, --agent <agent>",
        `Choice the IA agent to use with ${APPNAME}`,
      )
        .choices(AGENTS_SUPPORTED)
        .default("claude"),
    )
    .option("-k, --apikey <key>", "Set your IA APIKEY Agent")
    .option("-m, --model <model>", "Configure what model do want to use")
    .addOption(
      new Option(
        "-l, --lang <lang>",
        "Configure what language use in the suggested message",
      )
        .choices(LANGUAGES_SUPPORTED)
        .default("en"),
    )
    .option(
      "-t, --timeout <timeout>",
      "The maximum amount of time (in milliseconds) that the client should wait for a response from the server before timing out a single request.",
    )
    .addOption(
      new Option(
        "-r, --maxRetries <maxRetries>",
        "The maximum number of times that the client will retry a request in case of a temporary failure, like a network error or a 5XX error from the server.",
      ).default(2),
    )
    .option("-u, --url <url>", "Define the BaseURL to use with the agent")
    .action(async (options: Config) => {
      const spinner = ora("Updating your configuration...").start();

      try {
        if (options.url) {
          try {
            new URL(options.url);
          } catch {
            spinner.fail("Invalid URL");
            console.error(
              chalk.red(
                `Invalid URL format: "${options.url}". Provide a valid URL, e.g. http://localhost:11434`,
              ),
            );
            process.exit(1);
          }
        }

        if(!AGENTS_SUPPORTED.includes(options.model ?? "")){
          spinner.fail("Invalid model");
          console.error(
            chalk.red(
              `Invalid model: ${options.model}. Provide a valid supported model [${AGENTS_SUPPORTED.join(',')}]`
            )
          )
        }
        
        if(!LANGUAGES_SUPPORTED.includes(options.lang ?? "")){
          spinner.fail("Invalid language");
          console.error(
            chalk.red(
              `Invalid language: ${options.lang}. Provide a valid supported model [${LANGUAGES_SUPPORTED.join(',')}]`
            )
          )
        }

        const config: Config = {
          agent: options.agent,
          apikey: options.apikey,
          model: options.model,
          lang: options.lang,
          timeout: options.timeout,
          maxRetries: options.maxRetries,
          url: options.url,
        };

        const status = await saveConfig(config);

        if (status.error) {
          console.error(chalk.red(status.error));
          process.exit(1);
        }

        if (status.warnings?.length) {
          console.log(printTitleChalk("Warnings"));
          status.warnings.forEach((m) => {
            console.error("\t" + chalk.yellow(m));
          });
        }

        spinner.succeed("Configuration ready!");

        // Initialise ~/.config/sage/rules.json on first auth
        const { created, path: rulesPath } = await ensureRules();
        if (created) {
          console.log(
            chalk.dim(
              `\n  Rules file initialised at ${rulesPath}\n` +
                `  Customise it to control which file types are analysed.\n` +
                `  Run: ${APPNAME} rules --help for options.\n`,
            ),
          );
        }

        console.log(printSuccessChalk("Saved!"));
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
