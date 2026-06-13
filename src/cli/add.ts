import { Command } from "commander";
import * as readline from "node:readline";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { withSpinner } from "../utils/spinner.js";
import { storeCredentials, getKeychainCredentials, maskSecret } from "../auth/keychain.js";
import { getProviderAuthConfig, getAllProviderNames } from "../auth/providers.js";
import { APIError } from "../api/errors.js";

function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptForCredentials(
  provider: string,
  credentialKeys: string[]
): Promise<Record<string, string>> {
  const credentials: Record<string, string> = {};

  for (const key of credentialKeys) {
    const displayKey = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/_/g, " ");
    const value = await promptInput(chalk.dim(`  Enter ${displayKey}: `));
    if (!value) {
      throw new APIError({
        message: `No value provided for ${key}`,
        status: 0,
        provider,
        code: "MISSING_CREDENTIAL",
      });
    }
    credentials[key] = value;
  }

  return credentials;
}

export function registerAddCommand(program: Command): void {
  program
    .command("add <provider>")
    .description("Connect a cloud provider to conjra")
    .action(async (provider: string) => {
      const providerLower = provider.toLowerCase();
      const allProviders = getAllProviderNames();

      if (!allProviders.includes(providerLower)) {
        logger.error(`Unknown provider: ${provider}`);
        logger.dim(`Available providers: ${allProviders.join(", ")}`);
        process.exit(1);
      }

      const authConfig = getProviderAuthConfig(providerLower);
      if (!authConfig) {
        logger.error(`No auth config found for ${providerLower}`);
        process.exit(1);
      }

      logger.heading(`Connecting ${authConfig.displayName}`);

      // Check if already connected
      const existing = await getKeychainCredentials(providerLower);
      if (existing) {
        const maskedKeys = Object.entries(existing)
          .map(([key, val]) => `${key}=${maskSecret(val)}`)
          .join(", ");
        logger.warn(`${authConfig.displayName} is already connected (${maskedKeys})`);
        logger.dim(`Run ${chalk.cyan(`conjra remove ${providerLower}`)} first to reconnect.`);
        return;
      }

      logger.info(authConfig.promptMessage);
      console.log("");

      try {
        let credentials: Record<string, string>;

        if (authConfig.authMethod === "oauth" && authConfig.oauthConfig) {
          // OAuth flow — future implementation, prompt for manual token for now
          logger.warn("OAuth flow is not yet supported. Please enter a personal access token instead.");
          credentials = await promptForCredentials(providerLower, ["accessToken"]);
        } else if (authConfig.authMethod === "basic") {
          credentials = await promptForCredentials(providerLower, authConfig.credentialKeys);
        } else {
          credentials = await promptForCredentials(providerLower, authConfig.credentialKeys);
        }

        await withSpinner(
          `Storing credentials for ${authConfig.displayName}...`,
          async () => {
            await storeCredentials(providerLower, credentials);
          },
          "Credentials stored securely"
        );

        console.log("");
        const maskedKeys = Object.entries(credentials)
          .map(([key, val]) => `  ${chalk.bold(key)}: ${chalk.green(maskSecret(val))}`)
          .join("\n");
        logger.success(`${authConfig.displayName} connected!`);
        console.log(maskedKeys);
        console.log("");
        logger.dim(`You can now use ${authConfig.displayName} tools from Claude Code.`);
      } catch (err: unknown) {
        if (err instanceof APIError) {
          logger.error(err.message);
        } else {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`Failed to connect ${authConfig.displayName}: ${message}`);
        }
        process.exit(1);
      }
    });
}