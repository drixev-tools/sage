import { Command } from "commander";
import { getConfig } from "../services/config.service";
import chalk from "chalk";

export function registerConfigCommand(program: Command) {
  program
    .command("config")
    .description("Get your current saved settings")
    .option("-a, --all", "")
    .option("-k, --apikey", "")
    .option("-m, --model", "")
    .option("-t, --timeout", "")
    .option("-r, --maxRetries", "")
    .action(
      async (options: {
        all: boolean;
        apikey: boolean;
        model: boolean;
        timeout: boolean;
        maxRetries: boolean;
      }) => {
        const config = await getConfig();

        console.log(chalk.bgCyan("Your current settings are: \n"));
        if (options.all) {
          Object.entries(config).forEach(([key, val]) => {
            console.log(chalk.cyan(`\t${key}: ${val}\n`));
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
