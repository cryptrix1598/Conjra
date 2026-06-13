import chalk from "chalk";

export const logger = {
  info: (message: string): void => {
    console.log(chalk.cyan("ℹ") + " " + message);
  },

  success: (message: string): void => {
    console.log(chalk.green("✔") + " " + message);
  },

  warn: (message: string): void => {
    console.log(chalk.yellow("⚠") + " " + message);
  },

  error: (message: string): void => {
    console.log(chalk.red("✖") + " " + message);
  },

  heading: (message: string): void => {
    console.log("\n" + chalk.bold.blue(`━ ${message} ━`) + "\n");
  },

  dim: (message: string): void => {
    console.log(chalk.dim(message));
  },

  bullet: (label: string, value: string): void => {
    console.log(chalk.dim("  •") + " " + chalk.bold(label) + " " + value);
  },
};