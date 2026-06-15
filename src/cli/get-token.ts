import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { getKeychainCredentials, maskSecret } from "../auth/keychain.js";
import { getProviderAuthConfig } from "../auth/providers.js";

export function registerGetTokenCommand(program: Command): void {
  program
    .command("get-token <provider>")
    .description("Print a provider's API token for use by AI agents")
    .action(async (provider: string) => {
      const providerLower = provider.toLowerCase();
      const credentials = await getKeychainCredentials(providerLower);
      if (!credentials) {
        logger.error(`Provider "${providerLower}" is not connected. Run ${chalk.cyan(`conjra add ${providerLower}`)} first.`);
        process.exit(1);
      }

      const authConfig = getProviderAuthConfig(providerLower);
      const displayName = authConfig?.displayName ?? providerLower;

      logger.heading(`${displayName} credentials`);

      for (const [key, value] of Object.entries(credentials)) {
        console.log(`${chalk.bold(key)}=${value}`);
        logger.dim(`  (masked: ${maskSecret(value)})`);
      }
    });
}
