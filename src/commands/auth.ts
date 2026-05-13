import { Command, Option } from "commander";
import { saveConfig } from "../services/config.service";
import { Agents, Config } from "../types/config.types";
import chalk from "chalk";
import ora from "ora";
import {
  AGENTS_SUPPORTED,
  APPNAME,
  LANGUAGES_SUPPORTED,
} from "../lib/constants";

export function registerAuthCommand(program: Command): void {
  program
    .command("auth")
    .description(`Configure your IA agent to use with ${APPNAME}`)
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
    .action(async (options: Config) => {
      const spinner = ora("Updating your configuration...").start();

      try {
        const config: Config = {
          agent: options.agent as Agents,
          apikey: options.apikey,
          model: options.model,
          lang: options.lang,
          timeout: options.timeout,
          maxRetries: options.maxRetries,
        };

        const status = await saveConfig(config);

        if (status.error) {
          console.error(chalk.red(status.error));
          process.exit(1);
        }

        if (status.warnings?.length) {
          status.warnings.forEach((m) => {
            console.error(chalk.yellow(m));
          });
        }

        spinner.succeed("Configuration ready!");

        console.log(chalk.green("\n Saved!\n"));
      } catch (error) {
        spinner.fail("Something went wrong");
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}

/*
console.log(chalk.green(`Using the following settings:\n`));
    console.log(
      chalk.green(
        `\t
          agent:${this._config.agent}
          model: ${this._config.model}
          timeout: ${this._config.timeout}
          maxRetries: ${this._config.maxRetries}
          lang: ${this._config.lang}
        `,
      ),
    );
     */
