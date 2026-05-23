import { Command } from "commander";
import { getConfig } from "../services/config.service";
import chalk from "chalk";
import {
  printLabelAndDetailChalk,
  printTitleChalk,
} from "../lib/print.helpers";

export function registerConfigCommand(program: Command) {
  program
    .command("config")
    .description("Display your current AI provider configuration")
    .option("-a, --all", "Get all settings")
    .option("-k, --apikey", "Get ApiKey value")
    .option("-m, --model", "Get Model value")
    .option("-t, --timeout", "Get Timeout value")
    .option("-r, --maxRetries", "Get MaxRetries value")
    .action(
      async (options: {
        all: boolean;
        apikey: boolean;
        model: boolean;
        timeout: boolean;
        maxRetries: boolean;
      }) => {
        const config = await getConfig();
        const specificFlag =
          options.apikey ||
          options.model ||
          options.timeout ||
          options.maxRetries;
        const showAll = options.all || !specificFlag;

        console.log(printTitleChalk("Your current settings are"));
        if (showAll) {
          Object.entries(config).forEach(([key, val]) => {
            console.log(chalk.cyan(`\t*${key}: ${val}`));
          });
          process.exit(0);
        }

        if (options.apikey)
          console.log(printLabelAndDetailChalk("apikey", config.apikey ?? ""));
        if (options.model)
          console.log(printLabelAndDetailChalk("model", config.model ?? ""));
        if (options.timeout)
          console.log(printLabelAndDetailChalk("timeout", `${config.timeout}`));
        if (options.maxRetries)
          console.log(
            printLabelAndDetailChalk("maxRetries", `${config.maxRetries}`),
          );
      },
    );
}
