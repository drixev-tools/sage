import { Command, Option } from "commander";
import { getConfig } from "../services/config.service";
import chalk from "chalk";

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
        const specificFlag = options.apikey || options.model || options.timeout || options.maxRetries;
        const showAll = options.all || !specificFlag;

        console.log(chalk.bgCyan("Your current settings are: \n"));
        if (showAll) {
          Object.entries(config).forEach(([key, val]) => {
            console.log(chalk.cyan(`\t*${key}: ${val}`));
          });
          process.exit(0);
        }

        if (options.apikey)
          console.log(chalk.cyan(`\tapikey: ${config.apikey}\n`));
        if (options.model)
          console.log(chalk.cyan(`\tmodel: ${config.model}\n`));
        if (options.timeout)
          console.log(chalk.cyan(`\ttimeout: ${config.timeout}\n`));
        if (options.maxRetries)
          console.log(chalk.cyan(`\tmaxRetries: ${config.maxRetries}\n`));
      },
    );
}
