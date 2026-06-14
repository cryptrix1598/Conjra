import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { withSpinner } from "../utils/spinner.js";
import { SUPPORTED_EDITORS, getEditorById } from "../shared/supported-editors.js";
import type { SupportedEditor } from "../shared/supported-editors.js";

interface MCPServerConfig {
  command: string;
  args: string[];
}

function getServerConfig(): MCPServerConfig {
  const serverPath = join(process.cwd(), "dist", "mcp", "server.js");
  return {
    command: "node",
    args: [serverPath],
  };
}

function getNormalizedPath(editor: SupportedEditor): string {
  if (typeof editor.configPath === "string") return join(process.cwd(), editor.configPath);
  const platform = process.platform;
  if (platform === "win32") return editor.configPath.windows.replace("%USERPROFILE%", homedir()).replace("%APPDATA%", process.env.APPDATA || join(homedir(), "AppData", "Roaming"));
  if (platform === "darwin") return editor.configPath.mac;
  return editor.configPath.linux;
}

function writeMcpServersJson(configPath: string, serverConfig: MCPServerConfig): void {
  let config: Record<string, unknown> = {
    mcpServers: {},
  };
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, { encoding: "utf8" });
      config = JSON.parse(raw);
    } catch {
      logger.warn(`Could not parse existing config, creating fresh: ${configPath}`);
    }
  }
  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }
  (config.mcpServers as Record<string, MCPServerConfig>)["conjra"] = serverConfig;

  const dir = configPath.replace(/[/\\][^/\\]+$/, "");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk.cyan(configPath)}`);
}

function writeMcpKeyFormat(configPath: string, serverConfig: MCPServerConfig): void {
  let config: Record<string, unknown> = {
    mcp: {},
  };
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, { encoding: "utf8" });
      config = JSON.parse(raw);
    } catch {
      logger.warn(`Could not parse existing config, creating fresh: ${configPath}`);
    }
  }
  if (!config.mcp || typeof config.mcp !== "object") {
    config.mcp = {};
  }
  (config.mcp as Record<string, unknown>)["conjra"] = {
    type: "local",
    command: [serverConfig.command, ...serverConfig.args],
    enabled: true,
  };

  const dir = configPath.replace(/[/\\][^/\\]+$/, "");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk.cyan(configPath)}`);
}

function writeTomlFormat(configPath: string, serverConfig: MCPServerConfig): void {
  const tomlContent = `[mcp_servers.conjra]
command = "${serverConfig.command}"
args = [${serverConfig.args.map((a) => `"${a.replace(/\\/g, "\\\\")}"`).join(", ")}]
`;

  const dir = configPath.replace(/[/\\][^/\\]+$/, "");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let existing = "";
  if (existsSync(configPath)) {
    existing = readFileSync(configPath, { encoding: "utf8" });
  }

  if (existing.includes("[mcp_servers.conjra]")) {
    existing = existing.replace(/\[mcp_servers\.conjra\][^\[]*/s, tomlContent);
  } else if (existing.trim()) {
    existing = existing.trimEnd() + "\n\n" + tomlContent;
  } else {
    existing = tomlContent;
  }

  writeFileSync(configPath, existing, { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk.cyan(configPath)}`);
}

function writeYamlFormat(configPath: string, serverConfig: MCPServerConfig): void {
  const yamlContent = `mcp-servers:
  - name: conjra
    transport: stdio
    command: ${serverConfig.command}
    args: [${serverConfig.args.map((a) => `"${a.replace(/\\/g, "\\\\")}"`).join(", ")}]
`;

  const dir = configPath.replace(/[/\\][^/\\]+$/, "");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let existing = "";
  if (existsSync(configPath)) {
    existing = readFileSync(configPath, { encoding: "utf8" });
  }

  if (existing.includes("conjra")) {
    existing = existing + "\n" + yamlContent;
  } else if (existing.trim()) {
    existing = existing.trimEnd() + "\n" + yamlContent;
  } else {
    existing = yamlContent;
  }

  writeFileSync(configPath, existing, { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk.cyan(configPath)}`);
}

const formatWriters: Record<string, (path: string, config: MCPServerConfig) => void> = {
  mcpServers: writeMcpServersJson,
  mcp: writeMcpKeyFormat,
  toml: writeTomlFormat,
  yaml: writeYamlFormat,
};

function registerEditor(editor: SupportedEditor, serverConfig: MCPServerConfig): void {
  const configPath = getNormalizedPath(editor);
  const writer = formatWriters[editor.configFormat];
  if (!writer) {
    logger.warn(`No config writer for ${editor.name} (format: ${editor.configFormat})`);
    return;
  }
  writer(configPath, serverConfig);
}

function detectInstalledEditors(): SupportedEditor[] {
  const detected: SupportedEditor[] = [];
  for (const editor of SUPPORTED_EDITORS) {
    const configPath = getNormalizedPath(editor);
    if (existsSync(configPath)) {
      detected.push(editor);
    }
  }
  return detected;
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize conjra for your AI editor")
    .option("--ai <editor>", `AI editor to configure (${SUPPORTED_EDITORS.map((e) => e.id).join(" | ")} | all)`)
    .action(async (opts: { ai?: string }) => {
      const serverConfig = getServerConfig();

      if (opts.ai) {
        const editorValue = opts.ai.toLowerCase();

        if (editorValue === "all") {
          logger.heading(`Configuring conjra for all ${SUPPORTED_EDITORS.length} editors`);
          const results: { editor: string; ok: boolean }[] = [];
          for (const editor of SUPPORTED_EDITORS) {
            try {
              await withSpinner(
                `Configuring ${editor.name}...`,
                async () => registerEditor(editor, serverConfig),
                `Configured ${editor.name}`
              );
              results.push({ editor: editor.name, ok: true });
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              logger.warn(`Failed to configure ${editor.name}: ${msg}`);
              results.push({ editor: editor.name, ok: false });
            }
          }

          console.log("");
          const okCount = results.filter((r) => r.ok).length;
          logger.success(`Configured ${okCount}/${results.length} editors`);
          console.log("");
          logger.bullet("1.", `Add a provider: ${chalk.cyan("conjra add supabase")}`);
          logger.bullet("2.", `Check status:   ${chalk.cyan("conjra status")}`);
          logger.bullet("3.", `Start coding!   Ask your AI to use conjra tools.`);
          console.log("");
          return;
        }

        const editor = getEditorById(editorValue);
        if (!editor) {
          logger.error(
            `Invalid AI editor: "${opts.ai}". Must be one of: ${SUPPORTED_EDITORS.map((e) => e.id).join(", ")}, "all"`
          );
          process.exit(1);
        }

        logger.heading(`Initializing Conjra for ${editor.name}`);

        try {
          await withSpinner(
            `Registering conjra for ${editor.name}...`,
            async () => registerEditor(editor, serverConfig),
            `Registered for ${editor.name}`
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
        logger.bullet("3.", `Start coding!   Ask your AI to use conjra tools.`);
        console.log("");
      } else {
        // Auto-detect
        logger.heading("Detecting installed editors");
        const detected = detectInstalledEditors();
        if (detected.length === 0) {
          logger.warn("No supported AI editor config files found on this machine.");
          logger.dim(`Run ${chalk.cyan("conjra init --ai <editor>")} to configure a specific editor.`);
          logger.dim(`Or run ${chalk.cyan("conjra init --ai all")} to configure all editors.`);
          return;
        }

        logger.info(`Detected ${detected.length} editor(s) with existing config files:`);
        for (const editor of detected) {
          console.log(`  ${chalk.green("✔")} ${chalk.bold(editor.name)}  ${chalk.dim(getNormalizedPath(editor))}`);
        }

        console.log("");
        logger.info("Configuring detected editors...");
        for (const editor of detected) {
          try {
            await withSpinner(
              `Configuring ${editor.name}...`,
              async () => registerEditor(editor, serverConfig),
              `Configured ${editor.name}`
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`Failed to configure ${editor.name}: ${msg}`);
          }
        }

        console.log("");
        logger.success("Conjra is ready! Next steps:");
        console.log("");
        logger.bullet("1.", `Add a provider: ${chalk.cyan("conjra add supabase")}`);
        logger.bullet("2.", `Check status:   ${chalk.cyan("conjra status")}`);
        logger.bullet("3.", `Start coding!   Ask your AI to use conjra tools.`);
        console.log("");
      }
    });
}
