import { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { listConnectedProviders, getKeychainCredentials, maskSecret } from "../auth/keychain.js";
import { getProviderAuthConfig } from "../auth/providers.js";

const VERSION = "1.0.0";

interface MCPServerEntry {
  command: string;
  args?: string[];
}

interface ClaudeSettings {
  mcpServers?: Record<string, MCPServerEntry>;
  [key: string]: unknown;
}

function checkMCPServerRegistration(): { registered: boolean; location: string | null } {
  // Check Claude settings
  const claudeSettingsPath = join(homedir(), ".claude", "settings.json");
  if (existsSync(claudeSettingsPath)) {
    try {
      const raw = readFileSync(claudeSettingsPath, { encoding: "utf8" });
      const settings = JSON.parse(raw) as ClaudeSettings;
      if (settings.mcpServers?.["conjra"]) {
        return { registered: true, location: claudeSettingsPath };
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check Cursor
  const cursorConfigPath = join(process.cwd(), ".cursor", "mcp.json");
  if (existsSync(cursorConfigPath)) {
    try {
      const raw = readFileSync(cursorConfigPath, { encoding: "utf8" });
      const config = JSON.parse(raw) as Record<string, MCPServerEntry>;
      if (config["conjra"]) {
        return { registered: true, location: cursorConfigPath };
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check Windsurf
  const windsurfConfigPath = join(process.cwd(), ".windsurf", "mcp.json");
  if (existsSync(windsurfConfigPath)) {
    try {
      const raw = readFileSync(windsurfConfigPath, { encoding: "utf8" });
      const config = JSON.parse(raw) as Record<string, MCPServerEntry>;
      if (config["conjra"]) {
        return { registered: true, location: windsurfConfigPath };
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { registered: false, location: null };
}

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show conjra connection status")
    .action(async () => {
      logger.heading("Conjra Status");

      // Version
      logger.bullet("Version:", chalk.green(VERSION));
      console.log("");

      // Connected providers
      const providers = await listConnectedProviders();
      if (providers.length === 0) {
        logger.warn("No providers connected.");
        logger.dim(`Run ${chalk.cyan("conjra add <provider>")} to connect one.`);
      } else {
        logger.info(`Connected providers (${providers.length}):`);
        for (const provider of providers) {
          const authConfig = getProviderAuthConfig(provider);
          const displayName = authConfig?.displayName ?? provider;
          const credentials = await getKeychainCredentials(provider);

          if (credentials) {
            const maskedKeys = Object.entries(credentials)
              .map(([key, val]) => `${key}=${maskSecret(val)}`)
              .join(", ");
            console.log(`  ${chalk.green("✔")} ${chalk.bold(displayName)}  ${chalk.dim(maskedKeys)}`);
          } else {
            console.log(`  ${chalk.yellow("⚠")} ${chalk.bold(displayName)}  ${chalk.dim("credentials unreadable")}`);
          }
        }
      }

      console.log("");

      // MCP server registration
      const mcpStatus = checkMCPServerRegistration();
      if (mcpStatus.registered && mcpStatus.location) {
        logger.info(`MCP server: ${chalk.green("registered")} in ${chalk.cyan(mcpStatus.location)}`);
      } else {
        logger.warn("MCP server: not registered");
        logger.dim(`Run ${chalk.cyan("conjra init --ai claude")} to register.`);
      }
    });
}