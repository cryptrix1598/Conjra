import { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { listConnectedProviders, getKeychainCredentials, maskSecret } from "../auth/keychain.js";
import { getProviderAuthConfig } from "../auth/providers.js";
import { SUPPORTED_EDITORS } from "../shared/supported-editors.js";
import type { SupportedEditor } from "../shared/supported-editors.js";

const VERSION = "1.0.0";

function getNormalizedPath(editor: SupportedEditor): string {
  if (typeof editor.configPath === "string") return join(process.cwd(), editor.configPath);
  const platform = process.platform;
  if (platform === "win32") return editor.configPath.windows.replace("%USERPROFILE%", homedir()).replace("%APPDATA%", process.env.APPDATA || join(homedir(), "AppData", "Roaming"));
  if (platform === "darwin") return editor.configPath.mac;
  return editor.configPath.linux;
}

function checkEditorRegistration(editor: SupportedEditor): { registered: boolean; location: string | null } {
  const configPath = getNormalizedPath(editor);

  if (!existsSync(configPath)) {
    return { registered: false, location: null };
  }

  try {
    const raw = readFileSync(configPath, { encoding: "utf8" });

    if (!raw.trim()) {
      return { registered: false, location: null };
    }

    if (editor.configFormat === "toml") {
      const hasConjra = raw.includes('[mcp_servers.conjra]');
      return { registered: hasConjra, location: hasConjra ? configPath : null };
    }

    if (editor.configFormat === "yaml") {
      const hasConjra = raw.includes("conjra");
      return { registered: hasConjra, location: hasConjra ? configPath : null };
    }

    const config = JSON.parse(raw);

    if (editor.configFormat === "mcp") {
      const mcpSection = config.mcp as Record<string, unknown> | undefined;
      if (mcpSection && typeof mcpSection === "object" && "conjra" in mcpSection) {
        return { registered: true, location: configPath };
      }
    }

    const mcpServers = config.mcpServers as Record<string, unknown> | undefined;
    if (mcpServers && typeof mcpServers === "object" && "conjra" in mcpServers) {
      return { registered: true, location: configPath };
    }

    const servers = config.servers as Record<string, unknown> | undefined;
    if (servers && typeof servers === "object" && "conjra" in servers) {
      return { registered: true, location: configPath };
    }

    return { registered: false, location: null };
  } catch {
    return { registered: false, location: null };
  }
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

      // MCP server registration across all editors
      logger.info("MCP server registration status:");
      const results = SUPPORTED_EDITORS.map((editor) => ({
        editor,
        ...checkEditorRegistration(editor),
      }));

      const registered = results.filter((r) => r.registered);
      const unregistered = results.filter((r) => !r.registered);

      if (registered.length > 0) {
        for (const r of registered) {
          console.log(`  ${chalk.green("✔")} ${chalk.bold(r.editor.name)}  ${chalk.dim(r.location)}`);
        }
      }

      if (unregistered.length > 0) {
        if (registered.length > 0) console.log("");
        for (const r of unregistered) {
          console.log(`  ${chalk.dim("○")} ${chalk.dim(r.editor.name)}  ${chalk.dim("not registered")}`);
        }
      }

      console.log("");
      if (registered.length > 0) {
        logger.success(`MCP server registered in ${registered.length}/${results.length} editors`);
      }
      if (unregistered.length > 0) {
        logger.dim(`Run ${chalk.cyan("conjra init --ai <editor>")} to register for unconfigured editors.`);
        logger.dim(`Or run ${chalk.cyan("conjra init --ai all")} to configure all editors.`);
      }
    });
}
