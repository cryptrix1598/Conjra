import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { withSpinner } from "../utils/spinner.js";
import { removeCredentials } from "../auth/keychain.js";
import { getProviderAuthConfig, getAllProviderNames } from "../auth/providers.js";

export function registerRemoveCommand(program: Command): void {
  program
    .command("remove <provider>")
    .description("Disconnect a cloud provider from conjra")
    .action(async (provider: string) => {
      const providerLower = provider.toLowerCase();
      const allProviders = getAllProviderNames();

      if (!allProviders.includes(providerLower)) {
        logger.error(`Unknown provider: ${provider}`);
        logger.dim(`Available providers: ${allProviders.join(", ")}`);
        process.exit(1);
      }

      const authConfig = getProviderAuthConfig(providerLower);
      const displayName = authConfig?.displayName ?? providerLower;

      logger.heading(`Disconnecting ${displayName}`);

      try {
        const removed = await withSpinner(
          `Removing ${displayName} credentials...`,
          async () => {
            return await removeCredentials(providerLower);
          },
          "Done"
        );

        if (!removed) {
          logger.warn(`${displayName} was not connected. Nothing to remove.`);
          return;
        }

        console.log("");
        logger.success(`${displayName} has been disconnected.`);
        logger.dim(`Run ${chalk.cyan(`conjra add ${providerLower}`)} to reconnect.`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to remove ${displayName}: ${message}`);
        process.exit(1);
      }
    });
}