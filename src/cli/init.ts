import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { withSpinner } from "../utils/spinner.js";

type AIEditor = "claude" | "cursor" | "windsurf";

const VALID_EDITORS: AIEditor[] = ["claude", "cursor", "windsurf"];

interface MCPServerConfig {
  command: string;
  args: string[];
}

interface SettingsConfig {
  mcpServers?: Record<string, MCPServerConfig>;
  [key: string]: unknown;
}

function getServerConfig(): MCPServerConfig {
  const serverPath = join(process.cwd(), "dist", "mcp", "server.js");
  return {
    command: "node",
    args: [serverPath],
  };
}

function registerClaude(serverConfig: MCPServerConfig): void {
  const settingsPath = join(homedir(), ".claude", "settings.json");
  let settings: SettingsConfig = {};

  if (existsSync(settingsPath)) {
    try {
      const raw = readFileSync(settingsPath, { encoding: "utf8" });
      settings = JSON.parse(raw) as SettingsConfig;
    } catch {
      logger.warn("Could not parse existing Claude settings, creating fresh config");
    }
  }

  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  settings.mcpServers["conjra"] = serverConfig;

  const settingsDir = join(homedir(), ".claude");
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk.cyan(settingsPath)}`);
}

function registerCursor(serverConfig: MCPServerConfig): void {
  const configPath = join(process.cwd(), ".cursor", "mcp.json");
  let config: Record<string, MCPServerConfig> = {};

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, { encoding: "utf8" });
      config = JSON.parse(raw) as Record<string, MCPServerConfig>;
    } catch {
      logger.warn("Could not parse existing Cursor MCP config, creating fresh config");
    }
  }

  config["conjra"] = serverConfig;

  const configDir = join(process.cwd(), ".cursor");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk.cyan(configPath)}`);
}

function registerWindsurf(serverConfig: MCPServerConfig): void {
  const configPath = join(process.cwd(), ".windsurf", "mcp.json");
  let config: Record<string, MCPServerConfig> = {};

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, { encoding: "utf8" });
      config = JSON.parse(raw) as Record<string, MCPServerConfig>;
    } catch {
      logger.warn("Could not parse existing Windsurf MCP config, creating fresh config");
    }
  }

  config["conjra"] = serverConfig;

  const configDir = join(process.cwd(), ".windsurf");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk.cyan(configPath)}`);
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize conjra for your AI editor")
    .requiredOption("--ai <editor>", `AI editor to configure (${VALID_EDITORS.join(", ")})`)
    .action(async (opts: { ai: string }) => {
      const editor = opts.ai.toLowerCase() as AIEditor;

      if (!VALID_EDITORS.includes(editor)) {
        logger.error(`Invalid AI editor: ${opts.ai}. Must be one of: ${VALID_EDITORS.join(", ")}`);
        process.exit(1);
      }

      logger.heading("Initializing Conjra");

      const serverConfig = getServerConfig();

      try {
        await withSpinner(
          `Registering conjra for ${editor}...`,
          async () => {
            switch (editor) {
              case "claude":
                registerClaude(serverConfig);
                break;
              case "cursor":
                registerCursor(serverConfig);
                break;
              case "windsurf":
                registerWindsurf(serverConfig);
                break;
            }
          },
          `Registered for ${editor}`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to register: ${message}`);
        process.exit(1);
      }

      console.log("");
      logger.success("Conjra is ready! Next steps:");
      console.log("");
      logger.bullet("1.", `Add a provider: ${chalk.cyan("conjra add supabase")}`);
      logger.bullet("2.", `Check status:   ${chalk.cyan("conjra status")}`);
      logger.bullet("3.", `Start coding!   Ask Claude to use conjra tools.`);
      console.log("");
    });
}