#!/usr/bin/env node

// src/cli/index.ts
import { Command } from "commander";

// src/cli/init.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import chalk2 from "chalk";

// src/utils/logger.ts
import chalk from "chalk";
var logger = {
  info: (message) => {
    console.log(chalk.cyan("\u2139") + " " + message);
  },
  success: (message) => {
    console.log(chalk.green("\u2714") + " " + message);
  },
  warn: (message) => {
    console.log(chalk.yellow("\u26A0") + " " + message);
  },
  error: (message) => {
    console.log(chalk.red("\u2716") + " " + message);
  },
  heading: (message) => {
    console.log("\n" + chalk.bold.blue(`\u2501 ${message} \u2501`) + "\n");
  },
  dim: (message) => {
    console.log(chalk.dim(message));
  },
  bullet: (label, value) => {
    console.log(chalk.dim("  \u2022") + " " + chalk.bold(label) + " " + value);
  }
};

// src/utils/spinner.ts
import ora from "ora";
function createSpinner(text) {
  return ora({ text, spinner: "dots" });
}
async function withSpinner(text, fn, successText) {
  const spinner = createSpinner(text);
  spinner.start();
  try {
    const result = await fn();
    spinner.succeed(successText ?? text);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`${text} \u2014 ${message}`);
    throw err;
  }
}

// src/shared/supported-editors.ts
var SUPPORTED_EDITORS = [
  {
    id: "claude",
    name: "Claude Code",
    vendor: "Anthropic",
    configPath: { mac: "~/.claude/settings.json", windows: "%USERPROFILE%\\.claude\\settings.json", linux: "~/.claude/settings.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "Uses top-level mcpServers key. Project-level via .mcp.json in project root.",
    logoSlug: "claude"
  },
  {
    id: "cursor",
    name: "Cursor",
    vendor: "Anysphere",
    configPath: ".cursor/mcp.json",
    configFormat: "mcpServers",
    installScope: "project",
    notes: "Project-level only. Config file goes in project root .cursor/ directory.",
    logoSlug: "cursor"
  },
  {
    id: "windsurf",
    name: "Windsurf",
    vendor: "Codeium",
    configPath: ".windsurf/mcp.json",
    configFormat: "mcpServers",
    installScope: "project",
    notes: "Project-level only. Config file goes in project root .windsurf/ directory.",
    logoSlug: "windsurf"
  },
  {
    id: "antigravity",
    name: "Antigravity CLI",
    vendor: "Google",
    configPath: { mac: "~/.gemini/config/mcp_config.json", windows: "%USERPROFILE%\\.gemini\\config\\mcp_config.json", linux: "~/.gemini/config/mcp_config.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "Successor to Gemini CLI. Uses 'serverUrl' for remote servers instead of 'url'. Binary is 'agy'. Gemini CLI sunset June 18, 2026 for free/Pro/Ultra users.",
    logoSlug: "antigravity"
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    vendor: "Google",
    configPath: { mac: "~/.gemini/settings.json", windows: "%USERPROFILE%\\.gemini\\settings.json", linux: "~/.gemini/settings.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "Sunsetting June 18, 2026 for free/Pro/Ultra users. Code Assist Standard/Enterprise orgs retain access. Also supports project-level .gemini/settings.json.",
    logoSlug: "gemini"
  },
  {
    id: "codex",
    name: "Codex CLI",
    vendor: "OpenAI",
    configPath: { mac: "~/.codex/config.toml", windows: "%USERPROFILE%\\.codex\\config.toml", linux: "~/.codex/config.toml" },
    configFormat: "toml",
    installScope: "global",
    notes: "Uses TOML format: [mcp_servers.conjra] section with command/args/env. Also supports codex --mcp-config ./mcp-settings.json with mcpServers JSON. Has codex mcp add CLI command.",
    logoSlug: "codex"
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    vendor: "GitHub / Microsoft",
    configPath: { mac: "~/.copilot/mcp-config.json", windows: "%USERPROFILE%\\.copilot\\mcp-config.json", linux: "~/.copilot/mcp-config.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "Global config at ~/.copilot/mcp-config.json. Also supports workspace .mcp.json and .vscode/mcp.json. VS Code uses 'servers' key, Copilot CLI uses 'mcpServers'.",
    logoSlug: "copilot"
  },
  {
    id: "cline",
    name: "Cline",
    vendor: "Cline (Open Source)",
    configPath: { mac: "~/.cline/mcp.json", windows: "%APPDATA%\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\settings\\cline_mcp_settings.json", linux: "~/.cline/mcp.json" },
    configFormat: "mcpServers",
    installScope: "global",
    notes: "VS Code extension. Config stored in VS Code global storage or ~/.cline/mcp.json. CLI wizard: cline mcp.",
    logoSlug: "cline"
  },
  {
    id: "aider",
    name: "Aider",
    vendor: "Aider AI",
    configPath: { mac: "~/.aider.conf.yml", windows: "%USERPROFILE%\\.aider.conf.yml", linux: "~/.aider.conf.yml" },
    configFormat: "yaml",
    installScope: "both",
    notes: "Uses YAML format with mcp-servers array (not mcpServers object). Also supports --mcp-server CLI flags. Both stdio and HTTP transports. Project-level .aider.conf.yml also supported.",
    logoSlug: "aider"
  },
  {
    id: "continue",
    name: "Continue.dev",
    vendor: "Continue",
    configPath: { mac: "~/.continue/config.json", windows: "%USERPROFILE%\\.continue\\config.json", linux: "~/.continue/config.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "Open source AI coding assistant for VS Code and JetBrains. Config in ~/.continue/config.json with mcpServers key.",
    logoSlug: "continue"
  },
  {
    id: "opencode",
    name: "OpenCode",
    vendor: "anomalyco",
    configPath: { mac: "~/.config/opencode/opencode.json", windows: "%USERPROFILE%\\.config\\opencode\\opencode.json", linux: "~/.config/opencode/opencode.json" },
    configFormat: "mcp",
    installScope: "both",
    notes: "Uses 'mcp' key instead of 'mcpServers'. Each server has 'type': 'local', 'command' is an array, 'enabled': true. Project-level opencode.json also supported. 172k+ GitHub stars.",
    logoSlug: "opencode"
  },
  {
    id: "amazonq",
    name: "Amazon Q Developer",
    vendor: "AWS",
    configPath: { mac: "~/.aws/amazonq/mcp.json", windows: "%USERPROFILE%\\.aws\\amazonq\\mcp.json", linux: "~/.aws/amazonq/mcp.json" },
    configFormat: "mcpServers",
    installScope: "global",
    notes: "Supports both local stdio and remote HTTP MCP servers. OAuth flow for remote servers. Use qchat mcp add to configure via CLI.",
    logoSlug: "amazonq"
  },
  {
    id: "kiro",
    name: "Kiro",
    vendor: "AWS",
    configPath: { mac: "~/.kiro/settings/mcp.json", windows: "%USERPROFILE%\\.kiro\\settings\\mcp.json", linux: "~/.kiro/settings/mcp.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "AWS's spec-driven AI IDE. Global config at ~/.kiro/settings/mcp.json, project-level at .kiro/settings/mcp.json. Uses standard mcpServers format.",
    logoSlug: "kiro"
  },
  {
    id: "warp",
    name: "Warp 2.0",
    vendor: "Warp",
    configPath: { mac: "~/.warp/.mcp.json", windows: "%USERPROFILE%\\.warp\\.mcp.json", linux: "~/.warp/.mcp.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "AI-native terminal. Global: ~/.warp/.mcp.json, project: {repo_root}/.warp/.mcp.json. Has /agent-add-mcp built-in skill. Project-scoped servers require explicit approval.",
    logoSlug: "warp"
  },
  {
    id: "goose",
    name: "Goose",
    vendor: "Block / Linux Foundation (AAIF)",
    configPath: { mac: "~/.config/goose/config.yaml", windows: "%USERPROFILE%\\.config\\goose\\config.yaml", linux: "~/.config/goose/config.yaml" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "Open source AI agent (Apache 2.0). Runs as CLI + desktop. MCP-native architecture, 70+ extensions. Donated to Agentic AI Foundation under Linux Foundation.",
    logoSlug: "goose"
  },
  {
    id: "roocode",
    name: "Roo Code",
    vendor: "Roo Veterinary",
    configPath: { mac: "~/.roo/mcp_settings.json", windows: "%USERPROFILE%\\.roo\\mcp_settings.json", linux: "~/.roo/mcp_settings.json" },
    configFormat: "mcpServers",
    installScope: "global",
    notes: "VS Code extension, fork of Cline. Config at ~/.roo/mcp_settings.json using standard mcpServers format. Also supports VS Code settings.json under rooCode.mcpServers key.",
    logoSlug: "roocode"
  },
  {
    id: "qoder",
    name: "Qoder",
    vendor: "Alibaba Cloud",
    configPath: { mac: "~/.qoder/mcp.json", windows: "%USERPROFILE%\\.qoder\\mcp.json", linux: "~/.qoder/mcp.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "AI coding assistant by Alibaba Cloud. Supports both local stdio and remote MCP servers. Standard mcpServers JSON format.",
    logoSlug: "qoder"
  },
  {
    id: "trae",
    name: "Trae",
    vendor: "ByteDance",
    configPath: ".trae/mcp.json",
    configFormat: "mcpServers",
    installScope: "project",
    notes: "ByteDance's AI IDE. Project-level .trae/mcp.json (requires enabling Project MCP in beta settings). Also supports adding via Settings panel. Standard mcpServers format.",
    logoSlug: "trae"
  },
  {
    id: "droid",
    name: "Droid",
    vendor: "Factory",
    configPath: { mac: "~/.factory/mcp.json", windows: "%USERPROFILE%\\.factory\\mcp.json", linux: "~/.factory/mcp.json" },
    configFormat: "mcpServers",
    installScope: "both",
    notes: "AI coding agent by Factory. Config: .factory/mcp.json (project) or ~/.factory/mcp.json (global). CLI: droid mcp add. Supports http, sse, and stdio transports.",
    logoSlug: "droid"
  },
  {
    id: "kilocode",
    name: "KiloCode",
    vendor: "Kilo",
    configPath: { mac: "~/.config/kilo/kilo.jsonc", windows: "%USERPROFILE%\\.config\\kilo\\kilo.jsonc", linux: "~/.config/kilo/kilo.jsonc" },
    configFormat: "mcp",
    installScope: "both",
    notes: "VS Code extension and CLI. Uses 'mcp' key (not 'mcpServers'). 'command' is an array, 'type': 'local' or 'remote'. Config in kilo.jsonc. Supports OAuth for remote servers.",
    logoSlug: "kilocode"
  }
];
function getEditorById(id) {
  return SUPPORTED_EDITORS.find((e) => e.id === id);
}

// src/cli/init.ts
var __filename2 = fileURLToPath(import.meta.url);
var __dirname2 = dirname(__filename2);
function getServerConfig() {
  const serverPath = join(__dirname2, "..", "mcp", "server.js");
  if (!existsSync(serverPath)) {
    logger.warn(`MCP server script not found at target path: ${serverPath}`);
    logger.warn("Please run `npm run build` to compile the server script.");
  }
  return {
    command: "node",
    args: [serverPath]
  };
}
function getNormalizedPath(editor) {
  if (typeof editor.configPath === "string") return join(process.cwd(), editor.configPath);
  const platform = process.platform;
  if (platform === "win32") return editor.configPath.windows.replace("%USERPROFILE%", homedir()).replace("%APPDATA%", process.env.APPDATA || join(homedir(), "AppData", "Roaming"));
  if (platform === "darwin") return editor.configPath.mac;
  return editor.configPath.linux;
}
function writeMcpServersJson(configPath, serverConfig) {
  let config = {
    mcpServers: {}
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
  config.mcpServers["conjra"] = serverConfig;
  const dir = configPath.replace(/[/\\][^/\\]+$/, "");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk2.cyan(configPath)}`);
}
function writeMcpKeyFormat(configPath, serverConfig) {
  let config = {
    mcp: {}
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
  config.mcp["conjra"] = {
    type: "local",
    command: [serverConfig.command, ...serverConfig.args],
    enabled: true
  };
  const dir = configPath.replace(/[/\\][^/\\]+$/, "");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf8" });
  logger.success(`Registered conjra MCP server in ${chalk2.cyan(configPath)}`);
}
function writeTomlFormat(configPath, serverConfig) {
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
  logger.success(`Registered conjra MCP server in ${chalk2.cyan(configPath)}`);
}
function writeYamlFormat(configPath, serverConfig) {
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
  logger.success(`Registered conjra MCP server in ${chalk2.cyan(configPath)}`);
}
var formatWriters = {
  mcpServers: writeMcpServersJson,
  mcp: writeMcpKeyFormat,
  toml: writeTomlFormat,
  yaml: writeYamlFormat
};
function registerEditor(editor, serverConfig) {
  const configPath = getNormalizedPath(editor);
  const writer = formatWriters[editor.configFormat];
  if (!writer) {
    logger.warn(`No config writer for ${editor.name} (format: ${editor.configFormat})`);
    return;
  }
  writer(configPath, serverConfig);
}
function detectInstalledEditors() {
  const detected = [];
  for (const editor of SUPPORTED_EDITORS) {
    const configPath = getNormalizedPath(editor);
    if (existsSync(configPath)) {
      detected.push(editor);
    }
  }
  return detected;
}
function registerInitCommand(program2) {
  program2.command("init").description("Initialize conjra for your AI editor").option("--ai <editor>", `AI editor to configure (${SUPPORTED_EDITORS.map((e) => e.id).join(" | ")} | all)`).action(async (opts) => {
    const serverConfig = getServerConfig();
    if (opts.ai) {
      const editorValue = opts.ai.toLowerCase();
      if (editorValue === "all") {
        logger.heading(`Configuring conjra for all ${SUPPORTED_EDITORS.length} editors`);
        const results = [];
        for (const editor2 of SUPPORTED_EDITORS) {
          try {
            await withSpinner(
              `Configuring ${editor2.name}...`,
              async () => registerEditor(editor2, serverConfig),
              `Configured ${editor2.name}`
            );
            results.push({ editor: editor2.name, ok: true });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`Failed to configure ${editor2.name}: ${msg}`);
            results.push({ editor: editor2.name, ok: false });
          }
        }
        console.log("");
        const okCount = results.filter((r) => r.ok).length;
        logger.success(`Configured ${okCount}/${results.length} editors`);
        console.log("");
        logger.bullet("1.", `Add a provider: ${chalk2.cyan("conjra add supabase")}`);
        logger.bullet("2.", `Check status:   ${chalk2.cyan("conjra status")}`);
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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to register: ${message}`);
        process.exit(1);
      }
      console.log("");
      logger.success("Conjra is ready! Next steps:");
      console.log("");
      logger.bullet("1.", `Add a provider: ${chalk2.cyan("conjra add supabase")}`);
      logger.bullet("2.", `Check status:   ${chalk2.cyan("conjra status")}`);
      logger.bullet("3.", `Start coding!   Ask your AI to use conjra tools.`);
      console.log("");
    } else {
      logger.heading("Detecting installed editors");
      const detected = detectInstalledEditors();
      if (detected.length === 0) {
        logger.warn("No supported AI editor config files found on this machine.");
        logger.dim(`Run ${chalk2.cyan("conjra init --ai <editor>")} to configure a specific editor.`);
        logger.dim(`Or run ${chalk2.cyan("conjra init --ai all")} to configure all editors.`);
        return;
      }
      logger.info(`Detected ${detected.length} editor(s) with existing config files:`);
      for (const editor of detected) {
        console.log(`  ${chalk2.green("\u2714")} ${chalk2.bold(editor.name)}  ${chalk2.dim(getNormalizedPath(editor))}`);
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
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`Failed to configure ${editor.name}: ${msg}`);
        }
      }
      console.log("");
      logger.success("Conjra is ready! Next steps:");
      console.log("");
      logger.bullet("1.", `Add a provider: ${chalk2.cyan("conjra add supabase")}`);
      logger.bullet("2.", `Check status:   ${chalk2.cyan("conjra status")}`);
      logger.bullet("3.", `Start coding!   Ask your AI to use conjra tools.`);
      console.log("");
    }
  });
}

// src/cli/add.ts
import * as readline from "readline";
import chalk3 from "chalk";

// src/auth/keychain.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from "crypto";
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2, unlinkSync, readdirSync } from "fs";
import { join as join2 } from "path";
import { homedir as homedir2 } from "os";
import { hostname } from "os";
var SERVICE_NAME = "conjra";
var VAULT_DIR = join2(homedir2(), ".conjra", "vault");
function getMachineFingerprint() {
  const data = `${hostname()}-${process.platform}-${process.arch}-conjra-vault`;
  return createHash("sha256").update(data).digest("hex");
}
function getEncryptionKey() {
  const machineId = getMachineFingerprint();
  return scryptSync(machineId, `conjra-salt-${SERVICE_NAME}`, 32);
}
function getVaultPath(provider) {
  return join2(VAULT_DIR, `${provider}.enc`);
}
function ensureVaultDir() {
  if (!existsSync2(VAULT_DIR)) {
    mkdirSync2(VAULT_DIR, { recursive: true });
  }
}
function encrypt(data) {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}
function decrypt(encryptedData) {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
async function storeCredentials(provider, credentials) {
  ensureVaultDir();
  const data = JSON.stringify(credentials);
  const encrypted = encrypt(data);
  writeFileSync2(getVaultPath(provider), encrypted, { encoding: "utf8" });
}
async function getKeychainCredentials(provider) {
  const filePath = getVaultPath(provider);
  if (!existsSync2(filePath)) {
    return null;
  }
  try {
    const encrypted = readFileSync2(filePath, { encoding: "utf8" });
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}
async function removeCredentials(provider) {
  const filePath = getVaultPath(provider);
  if (!existsSync2(filePath)) {
    return false;
  }
  unlinkSync(filePath);
  return true;
}
async function listConnectedProviders() {
  if (!existsSync2(VAULT_DIR)) {
    return [];
  }
  const files = readdirSync(VAULT_DIR);
  return files.filter((f) => f.endsWith(".enc")).map((f) => f.replace(".enc", "")).sort();
}
function maskSecret(secret) {
  if (secret.length <= 8) {
    return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  }
  const prefix = secret.substring(0, 4);
  const suffix = secret.substring(secret.length - 4);
  return `${prefix}${"\u2022".repeat(Math.min(secret.length - 8, 12))}${suffix}`;
}

// src/auth/providers.ts
var PROVIDER_AUTH_CONFIGS = {
  supabase: {
    name: "supabase",
    displayName: "Supabase",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Supabase personal access token (from https://supabase.com/dashboard/account/tokens)"
  },
  railway: {
    name: "railway",
    displayName: "Railway",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Railway API token (from https://railway.app/account/tokens)"
  },
  vercel: {
    name: "vercel",
    displayName: "Vercel",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Vercel API token (from https://vercel.com/account/tokens)"
  },
  stripe: {
    name: "stripe",
    displayName: "Stripe",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Stripe secret key (sk_live_... or sk_test_...)"
  },
  clerk: {
    name: "clerk",
    displayName: "Clerk",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Clerk API key (from https://dashboard.clerk.com)"
  },
  resend: {
    name: "resend",
    displayName: "Resend",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Resend API key (from https://resend.com/api-keys)"
  },
  neon: {
    name: "neon",
    displayName: "Neon",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Neon API key (from https://console.neon.tech/settings/api-keys)"
  },
  upstash: {
    name: "upstash",
    displayName: "Upstash",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Upstash API key (from https://console.upstash.com/account/api-keys)"
  },
  github: {
    name: "github",
    displayName: "GitHub",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your GitHub personal access token (from https://github.com/settings/tokens)"
  },
  cloudflare: {
    name: "cloudflare",
    displayName: "Cloudflare",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Cloudflare API token (from https://dash.cloudflare.com/profile/api-tokens)"
  },
  firebase: {
    name: "firebase",
    displayName: "Firebase",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Firebase/GCP access token"
  },
  loops: {
    name: "loops",
    displayName: "Loops",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Loops API key (from https://app.loops.so/settings/api)"
  },
  twilio: {
    name: "twilio",
    displayName: "Twilio",
    authMethod: "basic",
    credentialKeys: ["accountSid", "authToken"],
    promptMessage: "Enter your Twilio Account SID and Auth Token (from https://console.twilio.com)"
  },
  openai: {
    name: "openai",
    displayName: "OpenAI",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your OpenAI API key (from https://platform.openai.com/api-keys)"
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Anthropic API key (from https://console.anthropic.com/settings/keys)"
  },
  replicate: {
    name: "replicate",
    displayName: "Replicate",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Replicate API token (from https://replicate.com/account/api-tokens)"
  },
  flyio: {
    name: "flyio",
    displayName: "Fly.io",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Fly.io API token (from https://fly.io/user/personal_access_tokens)"
  },
  awsamplify: {
    name: "awsamplify",
    displayName: "AWS Amplify",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your AWS access token"
  }
};
function getProviderAuthConfig(provider) {
  return PROVIDER_AUTH_CONFIGS[provider] ?? null;
}
function getAllProviderNames() {
  return Object.keys(PROVIDER_AUTH_CONFIGS).sort();
}

// src/api/errors.ts
var APIError = class _APIError extends Error {
  status;
  provider;
  code;
  details;
  constructor(opts) {
    super(opts.message);
    this.name = "APIError";
    this.status = opts.status;
    this.provider = opts.provider;
    this.code = opts.code ?? "UNKNOWN";
    this.details = opts.details;
    Object.setPrototypeOf(this, _APIError.prototype);
  }
  toString() {
    return `[${this.provider}] ${this.status} \u2014 ${this.message} (code: ${this.code})`;
  }
};
var AuthError = class _AuthError extends Error {
  provider;
  constructor(opts) {
    super(opts.message);
    this.name = "AuthError";
    this.provider = opts.provider;
    Object.setPrototypeOf(this, _AuthError.prototype);
  }
};
var ProviderNotConnectedError = class _ProviderNotConnectedError extends Error {
  provider;
  constructor(provider) {
    super(`Provider "${provider}" is not connected. Run: conjra add ${provider}`);
    this.name = "ProviderNotConnectedError";
    this.provider = provider;
    Object.setPrototypeOf(this, _ProviderNotConnectedError.prototype);
  }
};

// src/cli/add.ts
function promptInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
async function promptForCredentials(provider, credentialKeys) {
  const credentials = {};
  for (const key of credentialKeys) {
    const displayKey = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/_/g, " ");
    const value = await promptInput(chalk3.dim(`  Enter ${displayKey}: `));
    if (!value) {
      throw new APIError({
        message: `No value provided for ${key}`,
        status: 0,
        provider,
        code: "MISSING_CREDENTIAL"
      });
    }
    credentials[key] = value;
  }
  return credentials;
}
function registerAddCommand(program2) {
  program2.command("add <provider>").description("Connect a cloud provider to conjra").action(async (provider) => {
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
    const existing = await getKeychainCredentials(providerLower);
    if (existing) {
      const maskedKeys = Object.entries(existing).map(([key, val]) => `${key}=${maskSecret(val)}`).join(", ");
      logger.warn(`${authConfig.displayName} is already connected (${maskedKeys})`);
      logger.dim(`Run ${chalk3.cyan(`conjra remove ${providerLower}`)} first to reconnect.`);
      return;
    }
    logger.info(authConfig.promptMessage);
    console.log("");
    try {
      let credentials;
      if (authConfig.authMethod === "oauth" && authConfig.oauthConfig) {
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
      const maskedKeys = Object.entries(credentials).map(([key, val]) => `  ${chalk3.bold(key)}: ${chalk3.green(maskSecret(val))}`).join("\n");
      logger.success(`${authConfig.displayName} connected!`);
      console.log(maskedKeys);
      console.log("");
      logger.dim(`You can now use ${authConfig.displayName} tools from Claude Code.`);
    } catch (err) {
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

// src/cli/remove.ts
import chalk4 from "chalk";
function registerRemoveCommand(program2) {
  program2.command("remove <provider>").description("Disconnect a cloud provider from conjra").action(async (provider) => {
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
      logger.dim(`Run ${chalk4.cyan(`conjra add ${providerLower}`)} to reconnect.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to remove ${displayName}: ${message}`);
      process.exit(1);
    }
  });
}

// src/cli/status.ts
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "fs";
import { join as join3 } from "path";
import { homedir as homedir3 } from "os";
import chalk5 from "chalk";
var VERSION = "1.0.0";
function getNormalizedPath2(editor) {
  if (typeof editor.configPath === "string") return join3(process.cwd(), editor.configPath);
  const platform = process.platform;
  if (platform === "win32") return editor.configPath.windows.replace("%USERPROFILE%", homedir3()).replace("%APPDATA%", process.env.APPDATA || join3(homedir3(), "AppData", "Roaming"));
  if (platform === "darwin") return editor.configPath.mac;
  return editor.configPath.linux;
}
function checkEditorRegistration(editor) {
  const configPath = getNormalizedPath2(editor);
  if (!existsSync3(configPath)) {
    return { registered: false, location: null };
  }
  try {
    const raw = readFileSync3(configPath, { encoding: "utf8" });
    if (!raw.trim()) {
      return { registered: false, location: null };
    }
    if (editor.configFormat === "toml") {
      const hasConjra = raw.includes("[mcp_servers.conjra]");
      return { registered: hasConjra, location: hasConjra ? configPath : null };
    }
    if (editor.configFormat === "yaml") {
      const hasConjra = raw.includes("conjra");
      return { registered: hasConjra, location: hasConjra ? configPath : null };
    }
    const config = JSON.parse(raw);
    if (editor.configFormat === "mcp") {
      const mcpSection = config.mcp;
      if (mcpSection && typeof mcpSection === "object" && "conjra" in mcpSection) {
        return { registered: true, location: configPath };
      }
    }
    const mcpServers = config.mcpServers;
    if (mcpServers && typeof mcpServers === "object" && "conjra" in mcpServers) {
      return { registered: true, location: configPath };
    }
    const servers = config.servers;
    if (servers && typeof servers === "object" && "conjra" in servers) {
      return { registered: true, location: configPath };
    }
    return { registered: false, location: null };
  } catch {
    return { registered: false, location: null };
  }
}
function registerStatusCommand(program2) {
  program2.command("status").description("Show conjra connection status").action(async () => {
    logger.heading("Conjra Status");
    logger.bullet("Version:", chalk5.green(VERSION));
    console.log("");
    const providers = await listConnectedProviders();
    if (providers.length === 0) {
      logger.warn("No providers connected.");
      logger.dim(`Run ${chalk5.cyan("conjra add <provider>")} to connect one.`);
    } else {
      logger.info(`Connected providers (${providers.length}):`);
      for (const provider of providers) {
        const authConfig = getProviderAuthConfig(provider);
        const displayName = authConfig?.displayName ?? provider;
        const credentials = await getKeychainCredentials(provider);
        if (credentials) {
          const maskedKeys = Object.entries(credentials).map(([key, val]) => `${key}=${maskSecret(val)}`).join(", ");
          console.log(`  ${chalk5.green("\u2714")} ${chalk5.bold(displayName)}  ${chalk5.dim(maskedKeys)}`);
        } else {
          console.log(`  ${chalk5.yellow("\u26A0")} ${chalk5.bold(displayName)}  ${chalk5.dim("credentials unreadable")}`);
        }
      }
    }
    console.log("");
    logger.info("MCP server registration status:");
    const results = SUPPORTED_EDITORS.map((editor) => ({
      editor,
      ...checkEditorRegistration(editor)
    }));
    const registered = results.filter((r) => r.registered);
    const unregistered = results.filter((r) => !r.registered);
    if (registered.length > 0) {
      for (const r of registered) {
        console.log(`  ${chalk5.green("\u2714")} ${chalk5.bold(r.editor.name)}  ${chalk5.dim(r.location)}`);
      }
    }
    if (unregistered.length > 0) {
      if (registered.length > 0) console.log("");
      for (const r of unregistered) {
        console.log(`  ${chalk5.dim("\u25CB")} ${chalk5.dim(r.editor.name)}  ${chalk5.dim("not registered")}`);
      }
    }
    console.log("");
    if (registered.length > 0) {
      logger.success(`MCP server registered in ${registered.length}/${results.length} editors`);
    }
    if (unregistered.length > 0) {
      logger.dim(`Run ${chalk5.cyan("conjra init --ai <editor>")} to register for unconfigured editors.`);
      logger.dim(`Or run ${chalk5.cyan("conjra init --ai all")} to configure all editors.`);
    }
  });
}

// src/cli/get-token.ts
import chalk6 from "chalk";
function registerGetTokenCommand(program2) {
  program2.command("get-token <provider>").description("Print a provider's API token for use by AI agents").action(async (provider) => {
    const providerLower = provider.toLowerCase();
    const credentials = await getKeychainCredentials(providerLower);
    if (!credentials) {
      logger.error(`Provider "${providerLower}" is not connected. Run ${chalk6.cyan(`conjra add ${providerLower}`)} first.`);
      process.exit(1);
    }
    const authConfig = getProviderAuthConfig(providerLower);
    const displayName = authConfig?.displayName ?? providerLower;
    logger.heading(`${displayName} credentials`);
    for (const [key, value] of Object.entries(credentials)) {
      console.log(`${chalk6.bold(key)}=${value}`);
      logger.dim(`  (masked: ${maskSecret(value)})`);
    }
  });
}

// src/cli/check.ts
import { existsSync as existsSync4 } from "fs";
import { join as join4, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import chalk7 from "chalk";

// src/api/client.ts
var PROVIDER_CONFIGS = {
  supabase: {
    name: "supabase",
    baseUrl: "https://api.supabase.com/v1",
    authType: "bearer",
    headerName: "Authorization"
  },
  railway: {
    name: "railway",
    baseUrl: "https://backboard.railway.app/graphql/v1",
    authType: "bearer",
    headerName: "Authorization"
  },
  vercel: {
    name: "vercel",
    baseUrl: "https://api.vercel.com/v2",
    authType: "bearer",
    headerName: "Authorization"
  },
  stripe: {
    name: "stripe",
    baseUrl: "https://api.stripe.com/v1",
    authType: "bearer",
    headerName: "Authorization"
  },
  clerk: {
    name: "clerk",
    baseUrl: "https://api.clerk.com/v1",
    authType: "bearer",
    headerName: "Authorization"
  },
  resend: {
    name: "resend",
    baseUrl: "https://api.resend.com",
    authType: "bearer",
    headerName: "Authorization"
  },
  neon: {
    name: "neon",
    baseUrl: "https://console.neon.tech/api/v2",
    authType: "bearer",
    headerName: "Authorization"
  },
  upstash: {
    name: "upstash",
    baseUrl: "https://api.upstash.com/v2",
    authType: "apikey",
    headerName: "Authorization"
  },
  github: {
    name: "github",
    baseUrl: "https://api.github.com",
    authType: "bearer",
    headerName: "Authorization"
  },
  cloudflare: {
    name: "cloudflare",
    baseUrl: "https://api.cloudflare.com/client/v4",
    authType: "bearer",
    headerName: "Authorization"
  },
  firebase: {
    name: "firebase",
    baseUrl: "https://firebase.googleapis.com/v1beta1",
    authType: "bearer",
    headerName: "Authorization"
  },
  loops: {
    name: "loops",
    baseUrl: "https://app.loops.so/api/v1",
    authType: "bearer",
    headerName: "Authorization"
  },
  twilio: {
    name: "twilio",
    baseUrl: "https://api.twilio.com/2010-04-01",
    authType: "basic",
    headerName: "Authorization"
  },
  openai: {
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    authType: "bearer",
    headerName: "Authorization"
  },
  anthropic: {
    name: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    authType: "apikey",
    headerName: "x-api-key"
  },
  replicate: {
    name: "replicate",
    baseUrl: "https://api.replicate.com/v1",
    authType: "bearer",
    headerName: "Authorization"
  },
  flyio: {
    name: "flyio",
    baseUrl: "https://api.fly.io/v1",
    authType: "bearer",
    headerName: "Authorization"
  },
  awsamplify: {
    name: "awsamplify",
    baseUrl: "https://amplify.us-east-1.amazonaws.com",
    authType: "bearer",
    headerName: "Authorization"
  }
};
function getProviderConfig(provider) {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new APIError({
      message: `Unknown provider: ${provider}`,
      status: 0,
      provider,
      code: "UNKNOWN_PROVIDER"
    });
  }
  return config;
}
function buildAuthHeader(config, credentials) {
  switch (config.authType) {
    case "bearer":
      return `Bearer ${credentials.accessToken ?? credentials.apiKey}`;
    case "apikey":
      return credentials.apiKey;
    case "basic": {
      const encoded = Buffer.from(
        `${credentials.accountSid ?? credentials.username}:${credentials.authToken ?? credentials.password}`
      ).toString("base64");
      return `Basic ${encoded}`;
    }
  }
}
function buildProviderHeaders(provider, baseHeaders) {
  if (provider === "github") {
    baseHeaders["Accept"] = "application/vnd.github+json";
  }
  if (provider === "anthropic") {
    baseHeaders["anthropic-version"] = "2023-06-01";
  }
  if (provider === "stripe") {
  }
}
function objectToFormUrlencoded(obj, prefix = "") {
  const parts = [];
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const k = `${prefix}[${i}]`;
      const v = obj[i];
      if (v !== null && typeof v === "object") {
        parts.push(objectToFormUrlencoded(v, k));
      } else if (v !== void 0) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    }
  } else if (obj !== null && typeof obj === "object") {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const k = prefix ? `${prefix}[${key}]` : key;
        const v = obj[key];
        if (v !== null && typeof v === "object") {
          parts.push(objectToFormUrlencoded(v, k));
        } else if (v !== void 0) {
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
      }
    }
  } else if (obj !== void 0) {
    parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`);
  }
  return parts.join("&");
}
async function executeRequest(provider, opts, credentials) {
  const config = getProviderConfig(provider);
  const url = new URL(`${config.baseUrl}${opts.path}`);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      url.searchParams.set(key, value);
    }
  }
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "conjra/1.0.0",
    ...opts.headers
  };
  if (provider === "stripe" && (!opts.headers || !opts.headers["Content-Type"])) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  headers[config.headerName] = buildAuthHeader(config, credentials);
  buildProviderHeaders(provider, headers);
  let body;
  if (opts.body && opts.method !== "GET") {
    if (headers["Content-Type"] === "application/x-www-form-urlencoded") {
      body = objectToFormUrlencoded(opts.body);
    } else {
      body = JSON.stringify(opts.body);
    }
  }
  try {
    const response = await fetch(url.toString(), {
      method: opts.method,
      headers,
      body
    });
    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text().catch(() => void 0);
      }
      if (response.status === 401 || response.status === 403) {
        throw new AuthError({
          message: `Authentication failed for ${provider}. Your credentials may be expired or invalid.`,
          provider
        });
      }
      throw new APIError({
        message: `Request to ${provider} failed: ${response.status} ${response.statusText}`,
        status: response.status,
        provider,
        code: `HTTP_${response.status}`,
        details: errorDetails
      });
    }
    if (response.status === 204) {
      return void 0;
    }
    return await response.json();
  } catch (err) {
    if (err instanceof APIError || err instanceof AuthError || err instanceof ProviderNotConnectedError) {
      throw err;
    }
    throw new APIError({
      message: `Network error contacting ${provider}: ${err instanceof Error ? err.message : String(err)}`,
      status: 0,
      provider,
      code: "NETWORK_ERROR"
    });
  }
}
function apiClient(provider, opts, credentials) {
  return executeRequest(provider, opts, credentials);
}
async function apiRequest(provider, opts) {
  const credentials = await getKeychainCredentials(provider);
  if (!credentials) {
    throw new ProviderNotConnectedError(provider);
  }
  return executeRequest(provider, opts, credentials);
}

// src/mcp/registry.ts
import { z as z19 } from "zod";

// src/mcp/tools/supabase.ts
import { z } from "zod";
var supabaseTools = [
  {
    name: "create_supabase_project",
    description: "Create a new Supabase project. Returns the project ID, database URL, anon key, and service role key. Use this when the user wants to set up a new Supabase backend for their application.",
    inputSchema: z.object({
      name: z.string().describe("Human-readable project name"),
      organizationId: z.string().optional().describe("Supabase organization ID. If not provided, the default org is used."),
      region: z.string().optional().describe("AWS region for the project (e.g. us-east-1, eu-west-1). Defaults to us-east-1."),
      dbPassword: z.string().describe("Password for the PostgreSQL database (min 8 characters)")
    }),
    provider: "supabase",
    execute: async (input, credentials) => {
      const body = {
        name: input.name,
        db_pass: input.dbPassword,
        region: input.region ?? "us-east-1"
      };
      if (input.organizationId) {
        body.organization_id = input.organizationId;
      }
      return apiClient("supabase", {
        method: "POST",
        path: "/projects",
        body
      }, credentials);
    }
  },
  {
    name: "run_supabase_migration",
    description: "Execute a SQL migration on a Supabase project. Use this to create tables, add columns, enable RLS policies, or any other DDL/DML operation. The SQL is run against the project's PostgreSQL database.",
    inputSchema: z.object({
      projectId: z.string().describe("The Supabase project reference ID"),
      sql: z.string().describe("The SQL migration to execute"),
      name: z.string().describe("A descriptive name for this migration")
    }),
    provider: "supabase",
    execute: async (input, credentials) => {
      return apiClient("supabase", {
        method: "POST",
        path: `/projects/${input.projectId}/database/migrations`,
        body: {
          name: input.name,
          query: input.sql
        }
      }, credentials);
    }
  },
  {
    name: "get_supabase_url_and_keys",
    description: "Retrieve the API URL, anon key, and service role key for a Supabase project. Use this to get the environment variables needed to connect a frontend or backend to Supabase.",
    inputSchema: z.object({
      projectId: z.string().describe("The Supabase project reference ID")
    }),
    provider: "supabase",
    execute: async (input, credentials) => {
      const project = await apiClient("supabase", {
        method: "GET",
        path: `/projects/${input.projectId}`
      }, credentials);
      const keys = await apiClient("supabase", {
        method: "GET",
        path: `/projects/${input.projectId}/api-keys`
      }, credentials);
      const anonKey = keys.find((k) => k.name === "anon");
      const serviceKey = keys.find((k) => k.name === "service_role");
      return {
        url: `https://${input.projectId}.supabase.co`,
        anonKey: anonKey?.api_key ?? null,
        serviceRoleKey: serviceKey?.api_key ?? null,
        project: {
          id: project.id,
          name: project.name,
          region: project.region
        }
      };
    }
  },
  {
    name: "create_supabase_bucket",
    description: "Create a new storage bucket in a Supabase project. Storage buckets hold files (images, documents, etc.) that can be accessed via the Supabase Storage API.",
    inputSchema: z.object({
      projectId: z.string().describe("The Supabase project reference ID"),
      bucketId: z.string().describe("Unique identifier for the bucket (lowercase, no spaces)"),
      name: z.string().optional().describe("Display name for the bucket. Defaults to bucketId."),
      public: z.boolean().optional().describe("Whether the bucket should be publicly accessible. Defaults to false."),
      fileSizeLimit: z.number().optional().describe("Maximum file size in bytes. Defaults to no limit.")
    }),
    provider: "supabase",
    execute: async (input, credentials) => {
      const body = {
        id: input.bucketId,
        name: input.name ?? input.bucketId,
        public: input.public ?? false
      };
      if (input.fileSizeLimit !== void 0) {
        body.file_size_limit = input.fileSizeLimit;
      }
      return apiClient("supabase", {
        method: "POST",
        path: `/projects/${input.projectId}/storage/buckets`,
        body
      }, credentials);
    }
  }
];

// src/mcp/tools/stripe.ts
import { z as z2 } from "zod";
var stripeTools = [
  {
    name: "create_stripe_product",
    description: "Create a new product in Stripe. A product represents the item or service being sold. After creating a product, you typically create a price for it using create_stripe_price.",
    inputSchema: z2.object({
      name: z2.string().describe("The product's name, meant to be displayable to the customer"),
      description: z2.string().optional().describe("The product's description, meant to be displayable to the customer"),
      metadata: z2.record(z2.string(), z2.string()).optional().describe("Set of key-value pairs for custom metadata")
    }),
    provider: "stripe",
    execute: async (input, credentials) => {
      const body = { name: input.name };
      if (input.description) body.description = input.description;
      if (input.metadata) body.metadata = input.metadata;
      return apiClient("stripe", {
        method: "POST",
        path: "/products",
        body
      }, credentials);
    }
  },
  {
    name: "create_stripe_price",
    description: "Create a price for a Stripe product. A price defines how much and how frequently to charge for a product. Supports one-time and recurring (subscription) prices.",
    inputSchema: z2.object({
      productId: z2.string().describe("The ID of the product this price belongs to (prod_...)"),
      unitAmount: z2.number().describe("Price in cents (e.g. 2000 = $20.00)"),
      currency: z2.string().describe("Three-letter ISO currency code (e.g. usd, eur, gbp)"),
      recurring: z2.object({
        interval: z2.enum(["day", "week", "month", "year"]).describe("Billing frequency"),
        intervalCount: z2.number().optional().describe("Number of intervals between billings (e.g. 2 for every 2 months)")
      }).optional().describe("Set this for subscription prices. Omit for one-time prices."),
      nickname: z2.string().optional().describe("A brief description of the price, visible in the dashboard")
    }),
    provider: "stripe",
    execute: async (input, credentials) => {
      const body = {
        product: input.productId,
        unit_amount: input.unitAmount,
        currency: input.currency.toLowerCase()
      };
      if (input.recurring) {
        const recurringData = { interval: input.recurring.interval };
        if (input.recurring.intervalCount !== void 0) {
          recurringData.interval_count = input.recurring.intervalCount;
        }
        body.recurring = recurringData;
      }
      if (input.nickname) body.nickname = input.nickname;
      return apiClient("stripe", {
        method: "POST",
        path: "/prices",
        body
      }, credentials);
    }
  },
  {
    name: "create_stripe_webhook",
    description: "Create a webhook endpoint in Stripe. Webhooks notify your server when events occur in Stripe (e.g. payment succeeded, subscription canceled). Returns the endpoint URL and signing secret.",
    inputSchema: z2.object({
      url: z2.string().describe("The URL of the webhook endpoint (must be HTTPS)"),
      events: z2.array(z2.string()).describe("List of event types to listen for (e.g. ['payment_intent.succeeded', 'customer.subscription.deleted'])"),
      description: z2.string().optional().describe("Optional description for this webhook endpoint"),
      apiVersion: z2.string().optional().describe("Stripe API version for webhook calls (e.g. '2024-06-20')")
    }),
    provider: "stripe",
    execute: async (input, credentials) => {
      const body = {
        url: input.url,
        enabled_events: input.events
      };
      if (input.description) body.description = input.description;
      if (input.apiVersion) body.api_version = input.apiVersion;
      return apiClient("stripe", {
        method: "POST",
        path: "/webhook_endpoints",
        body
      }, credentials);
    }
  },
  {
    name: "get_stripe_account_info",
    description: "Retrieve information about the connected Stripe account. Returns account ID, business type, country, default currency, and other account details. Useful for verifying the connection works.",
    inputSchema: z2.object({}),
    provider: "stripe",
    execute: async (_input, credentials) => {
      return apiClient("stripe", {
        method: "GET",
        path: "/account"
      }, credentials);
    }
  }
];

// src/mcp/tools/railway.ts
import { z as z3 } from "zod";
var CREATE_PROJECT_MUTATION = `
mutation CreateProject($name: String!, $teamId: String) {
  projectCreate(input: { name: $name, teamId: $teamId }) {
    project {
      id
      name
      createdAt
    }
  }
}
`;
var DEPLOY_MUTATION = `
mutation Deploy($serviceId: String!, $environmentId: String!) {
  serviceDeploy(input: { serviceId: $serviceId, environmentId: $environmentId }) {
    deployment {
      id
      status
      createdAt
    }
  }
}
`;
var SET_ENV_VARS_MUTATION = `
mutation SetEnvVars($serviceId: String!, $environmentId: String!, $envVars: [EnvVarInput!]!) {
  serviceUpdate(input: { serviceId: $serviceId, environmentId: $environmentId, envVars: $envVars }) {
    service {
      id
      name
    }
  }
}
`;
var DEPLOYMENT_STATUS_QUERY = `
query GetDeploymentStatus($deploymentId: String!) {
  deployment(id: $deploymentId) {
    id
    status
    createdAt
    updatedAt
    service {
      name
    }
  }
}
`;
var railwayTools = [
  {
    name: "create_railway_project",
    description: "Create a new Railway project. A project is the top-level container for Railway services, environments, and deployments. Returns the project ID and name.",
    inputSchema: z3.object({
      name: z3.string().describe("Name for the new Railway project"),
      teamId: z3.string().optional().describe("Railway team ID. If not provided, creates under your personal account.")
    }),
    provider: "railway",
    execute: async (input, credentials) => {
      const variables = { name: input.name };
      if (input.teamId) variables.teamId = input.teamId;
      return apiClient("railway", {
        method: "POST",
        path: "/",
        body: {
          query: CREATE_PROJECT_MUTATION,
          variables
        }
      }, credentials);
    }
  },
  {
    name: "deploy_to_railway",
    description: "Trigger a deployment on a Railway service. The service must already exist in the project. This starts a new deployment using the latest code from the connected repo.",
    inputSchema: z3.object({
      serviceId: z3.string().describe("The Railway service ID to deploy"),
      environmentId: z3.string().describe("The Railway environment ID to deploy to")
    }),
    provider: "railway",
    execute: async (input, credentials) => {
      return apiClient("railway", {
        method: "POST",
        path: "/",
        body: {
          query: DEPLOY_MUTATION,
          variables: {
            serviceId: input.serviceId,
            environmentId: input.environmentId
          }
        }
      }, credentials);
    }
  },
  {
    name: "set_railway_env_vars",
    description: "Set environment variables on a Railway service. These variables are available to the running application. You can set multiple variables at once.",
    inputSchema: z3.object({
      serviceId: z3.string().describe("The Railway service ID"),
      environmentId: z3.string().describe("The Railway environment ID"),
      envVars: z3.array(z3.object({
        name: z3.string().describe("Environment variable name (e.g. DATABASE_URL)"),
        value: z3.string().describe("Environment variable value")
      })).describe("Array of environment variables to set")
    }),
    provider: "railway",
    execute: async (input, credentials) => {
      return apiClient("railway", {
        method: "POST",
        path: "/",
        body: {
          query: SET_ENV_VARS_MUTATION,
          variables: {
            serviceId: input.serviceId,
            environmentId: input.environmentId,
            envVars: input.envVars.map((v) => ({ name: v.name, value: v.value }))
          }
        }
      }, credentials);
    }
  },
  {
    name: "get_railway_deployment_status",
    description: "Check the status of a Railway deployment. Returns whether the deployment is building, deploying, succeeded, failed, or crashed, along with timestamps.",
    inputSchema: z3.object({
      deploymentId: z3.string().describe("The Railway deployment ID to check")
    }),
    provider: "railway",
    execute: async (input, credentials) => {
      return apiClient("railway", {
        method: "POST",
        path: "/",
        body: {
          query: DEPLOYMENT_STATUS_QUERY,
          variables: { deploymentId: input.deploymentId }
        }
      }, credentials);
    }
  }
];

// src/mcp/tools/vercel.ts
import { z as z4 } from "zod";
var vercelTools = [
  {
    name: "deploy_to_vercel",
    description: "Deploy a project to Vercel. Creates a new deployment from a Git repository or uploads files directly. Returns the deployment URL and status.",
    inputSchema: z4.object({
      projectId: z4.string().optional().describe("Vercel project ID. If omitted, a new project is created."),
      name: z4.string().describe("Project name (used if creating a new project)"),
      gitRepository: z4.string().optional().describe("Git repository URL (e.g. https://github.com/user/repo)"),
      gitBranch: z4.string().optional().describe("Git branch to deploy. Defaults to main."),
      framework: z4.string().optional().describe("Framework preset (nextjs, react, vite, nuxt, sveltekit, etc.)"),
      buildCommand: z4.string().optional().describe("Custom build command (e.g. 'npm run build')"),
      outputDirectory: z4.string().optional().describe("Output directory for build artifacts (e.g. 'dist', '.next')"),
      rootDirectory: z4.string().optional().describe("Root directory of the project within the repo")
    }),
    provider: "vercel",
    execute: async (input, credentials) => {
      if (input.projectId) {
        return apiClient("vercel", {
          method: "POST",
          path: "/deployments",
          body: {
            project: input.projectId,
            gitSource: input.gitRepository ? { url: input.gitRepository, ref: input.gitBranch ?? "main" } : void 0
          }
        }, credentials);
      }
      return apiClient("vercel", {
        method: "POST",
        path: "/projects",
        body: {
          name: input.name,
          gitRepository: input.gitRepository ? { url: input.gitRepository } : void 0,
          framework: input.framework,
          buildCommand: input.buildCommand,
          outputDirectory: input.outputDirectory,
          rootDirectory: input.rootDirectory
        }
      }, credentials);
    }
  },
  {
    name: "add_vercel_domain",
    description: "Add a custom domain to a Vercel project. The domain's DNS must be configured to point to Vercel before it will work. Returns the domain verification details.",
    inputSchema: z4.object({
      projectId: z4.string().describe("Vercel project ID"),
      domain: z4.string().describe("The domain name to add (e.g. 'example.com' or 'app.example.com')")
    }),
    provider: "vercel",
    execute: async (input, credentials) => {
      return apiClient("vercel", {
        method: "POST",
        path: `/projects/${input.projectId}/domains`,
        body: { name: input.domain }
      }, credentials);
    }
  },
  {
    name: "set_vercel_env",
    description: "Set an environment variable on a Vercel project. The variable can be scoped to Production, Preview, or Development environments. Existing variables with the same name are updated.",
    inputSchema: z4.object({
      projectId: z4.string().describe("Vercel project ID"),
      key: z4.string().describe("Environment variable name (e.g. DATABASE_URL)"),
      value: z4.string().describe("Environment variable value"),
      target: z4.array(z4.enum(["production", "preview", "development"])).optional().describe("Environments where this variable is available. Defaults to all three."),
      type: z4.enum(["plain", "encrypted", "sensitive"]).optional().describe("Variable type. Defaults to 'plain'.")
    }),
    provider: "vercel",
    execute: async (input, credentials) => {
      return apiClient("vercel", {
        method: "POST",
        path: `/projects/${input.projectId}/env`,
        body: {
          key: input.key,
          value: input.value,
          target: input.target ?? ["production", "preview", "development"],
          type: input.type ?? "plain"
        }
      }, credentials);
    }
  },
  {
    name: "get_vercel_deployment",
    description: "Get details about a Vercel deployment including its URL, status (ready, building, error), and build logs URL.",
    inputSchema: z4.object({
      deploymentId: z4.string().describe("Vercel deployment ID")
    }),
    provider: "vercel",
    execute: async (input, credentials) => {
      return apiClient("vercel", {
        method: "GET",
        path: `/deployments/${input.deploymentId}`
      }, credentials);
    }
  }
];

// src/mcp/tools/clerk.ts
import { z as z5 } from "zod";
var clerkTools = [
  {
    name: "create_clerk_app",
    description: "Create a new Clerk application instance. A Clerk app manages authentication (sign-in, sign-up, user management) for your application. Returns the app ID and instance URL.",
    inputSchema: z5.object({
      name: z5.string().describe("Name for the Clerk application")
    }),
    provider: "clerk",
    execute: async (input, credentials) => {
      return apiClient("clerk", {
        method: "POST",
        path: "/applications",
        body: { name: input.name }
      }, credentials);
    }
  },
  {
    name: "get_clerk_keys",
    description: "Retrieve the API keys for a Clerk application instance. Returns the publishable key (for frontend) and secret key (for backend). These are needed to integrate Clerk into your app.",
    inputSchema: z5.object({
      instanceId: z5.string().describe("Clerk instance ID")
    }),
    provider: "clerk",
    execute: async (input, credentials) => {
      return apiClient("clerk", {
        method: "GET",
        path: `/instances/${input.instanceId}/api_keys`
      }, credentials);
    }
  },
  {
    name: "configure_clerk_jwt",
    description: "Configure the JWT template for a Clerk instance. This controls the claims included in session tokens, which your backend uses to verify authentication. Returns the updated JWT template.",
    inputSchema: z5.object({
      instanceId: z5.string().describe("Clerk instance ID"),
      templateName: z5.string().describe("Name for the JWT template (e.g. 'default', 'supabase')"),
      claims: z5.record(z5.string(), z5.string()).optional().describe("Custom claims to include in the JWT payload (e.g. { 'sub': '{{user.id}}', 'email': '{{user.primary_email_address}}' })"),
      lifetime: z5.number().optional().describe("Token lifetime in seconds. Defaults to 60."),
      allowedClockSkew: z5.number().optional().describe("Allowed clock skew in seconds. Defaults to 5.")
    }),
    provider: "clerk",
    execute: async (input, credentials) => {
      const body = {
        name: input.templateName
      };
      if (input.claims) body.claims = input.claims;
      if (input.lifetime !== void 0) body.lifetime = input.lifetime;
      if (input.allowedClockSkew !== void 0) body.allowed_clock_skew = input.allowedClockSkew;
      return apiClient("clerk", {
        method: "POST",
        path: `/instances/${input.instanceId}/jwt_templates`,
        body
      }, credentials);
    }
  }
];

// src/mcp/tools/resend.ts
import { z as z6 } from "zod";
var resendTools = [
  {
    name: "add_resend_domain",
    description: "Add and verify a custom sending domain in Resend. After adding, you must configure DNS records (SPF, DKIM, DMARC) at your domain registrar. Returns the DNS records you need to add.",
    inputSchema: z6.object({
      domain: z6.string().describe("The domain name to add for sending email (e.g. 'example.com')")
    }),
    provider: "resend",
    execute: async (input, credentials) => {
      return apiClient("resend", {
        method: "POST",
        path: "/domains",
        body: { name: input.domain }
      }, credentials);
    }
  },
  {
    name: "create_resend_api_key",
    description: "Create a new Resend API key. API keys are used to send emails programmatically. You can scope keys to specific sending domains for security.",
    inputSchema: z6.object({
      name: z6.string().describe("A descriptive name for this API key"),
      domainId: z6.string().optional().describe("Restrict this key to a specific domain ID. If omitted, the key has full access."),
      permission: z6.enum(["full_access", "sending_access"]).optional().describe("Permission level. Defaults to 'sending_access'.")
    }),
    provider: "resend",
    execute: async (input, credentials) => {
      const body = { name: input.name };
      if (input.domainId) body.domain_id = input.domainId;
      if (input.permission) body.permission = input.permission;
      return apiClient("resend", {
        method: "POST",
        path: "/api-keys",
        body
      }, credentials);
    }
  },
  {
    name: "send_test_email",
    description: "Send a test email through Resend. Use this to verify your Resend setup is working correctly. Supports HTML and text content.",
    inputSchema: z6.object({
      to: z6.string().describe("Recipient email address"),
      from: z6.string().describe("Sender email in 'Name <email@domain.com>' format"),
      subject: z6.string().describe("Email subject line"),
      html: z6.string().optional().describe("HTML body content"),
      text: z6.string().optional().describe("Plain text body content. Used if HTML is not provided.")
    }),
    provider: "resend",
    execute: async (input, credentials) => {
      const body = {
        to: input.to,
        from: input.from,
        subject: input.subject
      };
      if (input.html) body.html = input.html;
      if (input.text) body.text = input.text;
      return apiClient("resend", {
        method: "POST",
        path: "/emails",
        body
      }, credentials);
    }
  }
];

// src/mcp/tools/neon.ts
import { z as z7 } from "zod";
var neonTools = [
  {
    name: "create_neon_project",
    description: "Create a new Neon PostgreSQL project. Neon provides serverless Postgres with auto-scaling and branching. Returns the project ID, connection string, and default branch info.",
    inputSchema: z7.object({
      name: z7.string().describe("Project name"),
      regionId: z7.string().optional().describe("AWS region ID (e.g. aws-us-east-1, aws-eu-west-1). Defaults to aws-us-east-1."),
      pgVersion: z7.number().optional().describe("PostgreSQL version (15 or 16). Defaults to 16.")
    }),
    provider: "neon",
    execute: async (input, credentials) => {
      const body = { project: { name: input.name } };
      if (input.regionId) body.project.region_id = input.regionId;
      if (input.pgVersion !== void 0) body.project.pg_version = input.pgVersion;
      return apiClient("neon", {
        method: "POST",
        path: "/projects",
        body
      }, credentials);
    }
  },
  {
    name: "create_neon_branch",
    description: "Create a branch in a Neon project. Branching lets you create a copy of your database for development, testing, or preview environments. Data is isolated per branch.",
    inputSchema: z7.object({
      projectId: z7.string().describe("The Neon project ID"),
      branchName: z7.string().describe("Name for the new branch (e.g. 'preview', 'staging')"),
      parentBranchId: z7.string().optional().describe("ID of the parent branch to branch from. Defaults to the primary branch.")
    }),
    provider: "neon",
    execute: async (input, credentials) => {
      const body = {
        branch: { name: input.branchName }
      };
      if (input.parentBranchId) body.branch.parent_id = input.parentBranchId;
      return apiClient("neon", {
        method: "POST",
        path: `/projects/${input.projectId}/branches`,
        body
      }, credentials);
    }
  },
  {
    name: "get_neon_connection_string",
    description: "Retrieve the PostgreSQL connection string for a Neon project branch. This is the URI you use in your application's DATABASE_URL environment variable.",
    inputSchema: z7.object({
      projectId: z7.string().describe("The Neon project ID"),
      branchId: z7.string().optional().describe("Branch ID. Defaults to the primary branch."),
      databaseName: z7.string().optional().describe("Database name. Defaults to 'neondb'."),
      roleName: z7.string().optional().describe("Role name. Defaults to the project owner.")
    }),
    provider: "neon",
    execute: async (input, credentials) => {
      const query = {};
      if (input.branchId) query.branch_id = input.branchId;
      if (input.databaseName) query.database_name = input.databaseName;
      if (input.roleName) query.role_name = input.roleName;
      return apiClient("neon", {
        method: "GET",
        path: `/projects/${input.projectId}/connection_string`,
        query: Object.keys(query).length > 0 ? query : void 0
      }, credentials);
    }
  }
];

// src/mcp/tools/upstash.ts
import { z as z8 } from "zod";
var upstashTools = [
  {
    name: "create_upstash_redis",
    description: "Create a new Upstash Redis instance. Upstash provides serverless Redis with per-request pricing and TLS. Returns the REST URL and token for connecting.",
    inputSchema: z8.object({
      name: z8.string().describe("Name for the Redis instance"),
      region: z8.string().optional().describe("Region for the instance (e.g. us-east-1, eu-west-1). Defaults to us-east-1."),
      tls: z8.boolean().optional().describe("Enable TLS. Defaults to true."),
      ephemeral: z8.boolean().optional().describe("Create an ephemeral instance (data lost on eviction). Defaults to false.")
    }),
    provider: "upstash",
    execute: async (input, credentials) => {
      const body = { name: input.name };
      if (input.region) body.region = input.region;
      if (input.tls !== void 0) body.tls = input.tls;
      if (input.ephemeral !== void 0) body.ephemeral = input.ephemeral;
      return apiClient("upstash", {
        method: "POST",
        path: "/redis",
        body
      }, credentials);
    }
  },
  {
    name: "create_upstash_kafka",
    description: "Create a new Upstash Kafka cluster. Upstash Kafka provides serverless Kafka with per-message pricing. Returns cluster credentials for connecting producers and consumers.",
    inputSchema: z8.object({
      name: z8.string().describe("Name for the Kafka cluster"),
      region: z8.string().optional().describe("Region for the cluster (e.g. us-east-1, eu-west-1). Defaults to us-east-1."),
      partitions: z8.number().optional().describe("Number of default partitions. Defaults to 1.")
    }),
    provider: "upstash",
    execute: async (input, credentials) => {
      const body = { name: input.name };
      if (input.region) body.region = input.region;
      if (input.partitions !== void 0) body.partitions = input.partitions;
      return apiClient("upstash", {
        method: "POST",
        path: "/kafka",
        body
      }, credentials);
    }
  },
  {
    name: "get_upstash_credentials",
    description: "Retrieve the connection credentials for an Upstash resource (Redis or Kafka). Returns the endpoint URL, password/token, and other connection details needed by your application.",
    inputSchema: z8.object({
      resourceId: z8.string().describe("The Upstash resource ID"),
      type: z8.enum(["redis", "kafka", "qstash"]).describe("The type of Upstash resource")
    }),
    provider: "upstash",
    execute: async (input, credentials) => {
      const basePath = input.type === "redis" ? "/redis" : input.type === "kafka" ? "/kafka" : "/qstash";
      return apiClient("upstash", {
        method: "GET",
        path: `${basePath}/${input.resourceId}`
      }, credentials);
    }
  }
];

// src/mcp/tools/github.ts
import { z as z9 } from "zod";
var githubTools = [
  {
    name: "create_github_repo",
    description: "Create a new GitHub repository. Returns the repository URL, clone URL, and default branch name. Use this to set up a new project's code repository.",
    inputSchema: z9.object({
      name: z9.string().describe("Repository name (e.g. 'my-app')"),
      description: z9.string().optional().describe("Repository description"),
      private: z9.boolean().optional().describe("Whether the repo should be private. Defaults to true."),
      autoInit: z9.boolean().optional().describe("Initialize with a README. Defaults to true."),
      org: z9.string().optional().describe("Organization to create the repo under. If omitted, creates under your personal account.")
    }),
    provider: "github",
    execute: async (input, credentials) => {
      const path = input.org ? `/orgs/${input.org}/repos` : "/user/repos";
      const body = {
        name: input.name,
        private: input.private ?? true,
        auto_init: input.autoInit ?? true
      };
      if (input.description) body.description = input.description;
      return apiClient("github", {
        method: "POST",
        path,
        body
      }, credentials);
    }
  },
  {
    name: "add_github_secret",
    description: "Add or update a repository secret for GitHub Actions. These secrets are encrypted and available in your CI/CD workflows. The value must be base64-encoded and encrypted with the repo's public key.",
    inputSchema: z9.object({
      owner: z9.string().describe("Repository owner (username or org name)"),
      repo: z9.string().describe("Repository name"),
      secretName: z9.string().describe("Name of the secret (e.g. 'DEPLOY_KEY', 'API_TOKEN')"),
      secretValue: z9.string().describe("The plaintext value of the secret. It will be encrypted automatically.")
    }),
    provider: "github",
    execute: async (input, credentials) => {
      const pubkeyResponse = await apiClient("github", {
        method: "GET",
        path: `/repos/${input.owner}/${input.repo}/actions/secrets/public-key`
      }, credentials);
      const { publicEncrypt, createPublicKey } = await import("crypto");
      const publicKey = createPublicKey({
        key: Buffer.from(pubkeyResponse.key, "base64"),
        format: "der",
        type: "spki"
      });
      const encrypted = publicEncrypt(
        {
          key: publicKey,
          padding: await import("crypto").then((c) => c.constants.RSA_PKCS1_PADDING)
        },
        Buffer.from(input.secretValue)
      ).toString("base64");
      return apiClient("github", {
        method: "PUT",
        path: `/repos/${input.owner}/${input.repo}/actions/secrets/${input.secretName}`,
        body: {
          encrypted_value: encrypted,
          key_id: pubkeyResponse.key_id
        }
      }, credentials);
    }
  },
  {
    name: "create_github_webhook",
    description: "Create a webhook for a GitHub repository. Webhooks notify your server when events happen in the repo (pushes, PRs, issues, etc.). Returns the webhook configuration.",
    inputSchema: z9.object({
      owner: z9.string().describe("Repository owner (username or org name)"),
      repo: z9.string().describe("Repository name"),
      url: z9.string().describe("Payload URL where GitHub sends webhook events (must be HTTPS)"),
      events: z9.array(z9.string()).optional().describe("Events that trigger the webhook (e.g. ['push', 'pull_request']). Defaults to ['push']."),
      secret: z9.string().optional().describe("Secret for webhook signature verification"),
      active: z9.boolean().optional().describe("Whether the webhook is active. Defaults to true.")
    }),
    provider: "github",
    execute: async (input, credentials) => {
      const body = {
        name: "web",
        active: input.active ?? true,
        config: {
          url: input.url,
          content_type: "json",
          ...input.secret ? { secret: input.secret } : {}
        },
        events: input.events ?? ["push"]
      };
      return apiClient("github", {
        method: "POST",
        path: `/repos/${input.owner}/${input.repo}/hooks`,
        body
      }, credentials);
    }
  }
];

// src/mcp/tools/cloudflare.ts
import { z as z10 } from "zod";
var cloudflareTools = [
  {
    name: "add_cloudflare_domain",
    description: "Add a domain to Cloudflare for DNS management and CDN. After adding, you must update the domain's nameservers at your registrar to Cloudflare's assigned nameservers.",
    inputSchema: z10.object({
      domain: z10.string().describe("The domain name to add (e.g. 'example.com')"),
      type: z10.enum(["full", "partial"]).optional().describe("'full' for full setup (DNS + proxy), 'partial' for CNAME setup. Defaults to 'full'.")
    }),
    provider: "cloudflare",
    execute: async (input, credentials) => {
      const body = {
        name: input.domain,
        type: input.type ?? "full"
      };
      return apiClient("cloudflare", {
        method: "POST",
        path: "/zones",
        body
      }, credentials);
    }
  },
  {
    name: "create_cloudflare_worker",
    description: "Create or update a Cloudflare Worker script. Workers run serverless functions at the edge. Provide the JavaScript/TypeScript source code and the worker name.",
    inputSchema: z10.object({
      workerName: z10.string().describe("Name for the Worker (e.g. 'api-proxy', 'redirect-handler')"),
      script: z10.string().describe("The Worker's JavaScript source code"),
      compatibilityDate: z10.string().optional().describe("Compatibility date (e.g. '2024-01-01'). Defaults to current date."),
      compatibilityFlags: z10.array(z10.string()).optional().describe("Compatibility flags to enable")
    }),
    provider: "cloudflare",
    execute: async (input, credentials) => {
      const body = {
        name: input.workerName,
        script: input.script,
        compatibility_date: input.compatibilityDate ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      if (input.compatibilityFlags) body.compatibility_flags = input.compatibilityFlags;
      const accountId = credentials.accountId ?? credentials.apiKey?.split("-")[0];
      return apiClient("cloudflare", {
        method: "PUT",
        path: `/accounts/${accountId}/workers/scripts/${input.workerName}`,
        body
      }, credentials);
    }
  },
  {
    name: "get_cloudflare_zone",
    description: "Get details about a Cloudflare zone (domain). Returns the zone ID, status, nameservers, and plan information. You need the zone ID for most other Cloudflare API operations.",
    inputSchema: z10.object({
      identifier: z10.string().describe("Zone ID or domain name")
    }),
    provider: "cloudflare",
    execute: async (input, credentials) => {
      return apiClient("cloudflare", {
        method: "GET",
        path: `/zones`,
        query: { name: input.identifier }
      }, credentials);
    }
  }
];

// src/mcp/tools/firebase.ts
import { z as z11 } from "zod";
var firebaseTools = [
  {
    name: "create_firebase_project",
    description: "Create a new Firebase project via the Google Cloud Platform. Firebase projects use GCP under the hood. Returns the project ID, display name, and project number.",
    inputSchema: z11.object({
      projectId: z11.string().describe("Globally unique project ID (lowercase, 6-30 chars, alphanumeric plus hyphens)"),
      displayName: z11.string().optional().describe("Human-readable project name. Defaults to projectId.")
    }),
    provider: "firebase",
    execute: async (input, credentials) => {
      const body = {
        projectId: input.projectId
      };
      if (input.displayName) body.displayName = input.displayName;
      return apiClient("firebase", {
        method: "POST",
        path: "/projects",
        body
      }, credentials);
    }
  },
  {
    name: "get_firebase_config",
    description: "Retrieve the Firebase client configuration for a project. This includes the API key, auth domain, project ID, storage bucket, messaging sender ID, and app ID \u2014 all the values needed for firebaseConfig in your frontend.",
    inputSchema: z11.object({
      projectId: z11.string().describe("The Firebase/GCP project ID")
    }),
    provider: "firebase",
    execute: async (input, credentials) => {
      return apiClient("firebase", {
        method: "GET",
        path: `/projects/${input.projectId}/adminSdkConfig`
      }, credentials);
    }
  },
  {
    name: "enable_firebase_auth",
    description: "Enable a Firebase Authentication provider for a project. After enabling, users can sign in using the specified method (email/password, Google, GitHub, etc.).",
    inputSchema: z11.object({
      projectId: z11.string().describe("The Firebase/GCP project ID"),
      providerId: z11.enum([
        "password",
        "google.com",
        "github.com",
        "facebook.com",
        "twitter.com",
        "apple.com",
        "microsoft.com",
        "yahoo.com",
        "phone",
        "anonymous"
      ]).describe("The auth provider to enable"),
      clientId: z11.string().optional().describe("OAuth client ID (required for Google, GitHub, Facebook, etc.)"),
      clientSecret: z11.string().optional().describe("OAuth client secret (required for Google, GitHub, Facebook, etc.)")
    }),
    provider: "firebase",
    execute: async (input, credentials) => {
      const body = {};
      if (input.clientId) body.clientId = input.clientId;
      if (input.clientSecret) body.clientSecret = input.clientSecret;
      return apiClient("firebase", {
        method: "PATCH",
        path: `/projects/${input.projectId}/config`,
        body: {
          signIn: {
            [input.providerId]: {
              enabled: true,
              ...body
            }
          }
        }
      }, credentials);
    }
  }
];

// src/mcp/tools/loops.ts
import { z as z12 } from "zod";
var loopsTools = [
  {
    name: "create_loops_contact",
    description: "Create or update a contact in Loops. Loops is an email marketing platform. Contacts can have custom properties and belong to mailing lists. If a contact with the same email exists, it is updated.",
    inputSchema: z12.object({
      email: z12.string().describe("Contact email address"),
      firstName: z12.string().optional().describe("Contact's first name"),
      lastName: z12.string().optional().describe("Contact's last name"),
      subscribed: z12.boolean().optional().describe("Whether the contact is opted in to emails. Defaults to true."),
      mailingLists: z12.record(z12.string(), z12.boolean()).optional().describe("Mailing list IDs mapped to boolean (true = subscribed, false = unsubscribed)"),
      customProperties: z12.record(z12.string(), z12.string()).optional().describe("Custom properties for the contact (e.g. { plan: 'pro', signupDate: '2024-01-01' })")
    }),
    provider: "loops",
    execute: async (input, credentials) => {
      const body = { email: input.email };
      if (input.firstName) body.firstName = input.firstName;
      if (input.lastName) body.lastName = input.lastName;
      if (input.subscribed !== void 0) body.subscribed = input.subscribed;
      if (input.mailingLists) body.mailingLists = input.mailingLists;
      if (input.customProperties) {
        for (const [key, value] of Object.entries(input.customProperties)) {
          body[key] = value;
        }
      }
      return apiClient("loops", {
        method: "POST",
        path: "/contacts/create",
        body
      }, credentials);
    }
  },
  {
    name: "create_loops_campaign",
    description: "Send a transactional email or trigger a Loops campaign event. Use this to send targeted emails to contacts based on events in your application (e.g. welcome emails, password resets).",
    inputSchema: z12.object({
      transactionalId: z12.string().describe("The transactional email ID from your Loops dashboard"),
      email: z12.string().describe("Recipient email address"),
      dataVariables: z12.record(z12.string(), z12.string()).optional().describe("Template variables to populate in the email (e.g. { companyName: 'Acme', userName: 'Alice' })")
    }),
    provider: "loops",
    execute: async (input, credentials) => {
      const body = {
        transactionalId: input.transactionalId,
        email: input.email
      };
      if (input.dataVariables) body.dataVariables = input.dataVariables;
      return apiClient("loops", {
        method: "POST",
        path: "/transactional",
        body
      }, credentials);
    }
  },
  {
    name: "get_loops_api_key",
    description: "Verify the Loops API key is valid by checking the API status. Returns the API key status and account info. Useful for testing the connection after adding Loops as a provider.",
    inputSchema: z12.object({}),
    provider: "loops",
    execute: async (_input, credentials) => {
      return apiClient("loops", {
        method: "GET",
        path: "/api-key"
      }, credentials);
    }
  }
];

// src/mcp/tools/twilio.ts
import { z as z13 } from "zod";
var twilioTools = [
  {
    name: "send_twilio_sms",
    description: "Send an SMS message via Twilio. Requires a Twilio phone number as the sender. Returns the message SID and status. Message length is limited to 160 characters for standard SMS.",
    inputSchema: z13.object({
      to: z13.string().describe("Recipient phone number in E.164 format (e.g. '+15551234567')"),
      from: z13.string().describe("Your Twilio phone number in E.164 format (e.g. '+15559876543')"),
      body: z13.string().describe("The text message content (max 160 chars for standard SMS, 1600 for long SMS)"),
      statusCallback: z13.string().optional().describe("URL where Twilio posts message status updates")
    }),
    provider: "twilio",
    execute: async (input, credentials) => {
      const accountSid = credentials.accountSid;
      const body = new URLSearchParams({
        To: input.to,
        From: input.from,
        Body: input.body
      });
      if (input.statusCallback) body.set("StatusCallback", input.statusCallback);
      return apiClient("twilio", {
        method: "POST",
        path: `/Accounts/${accountSid}/Messages.json`,
        body: Object.fromEntries(body.entries()),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }, credentials);
    }
  },
  {
    name: "get_twilio_phone_numbers",
    description: "List phone numbers available in your Twilio account. These are numbers you have purchased and can use as senders for SMS or voice calls.",
    inputSchema: z13.object({
      accountSid: z13.string().optional().describe("Twilio Account SID. Defaults to the one stored in keychain.")
    }),
    provider: "twilio",
    execute: async (input, credentials) => {
      const sid = input.accountSid ?? credentials.accountSid;
      return apiClient("twilio", {
        method: "GET",
        path: `/Accounts/${sid}/IncomingPhoneNumbers.json`
      }, credentials);
    }
  },
  {
    name: "create_twilio_webhook",
    description: "Configure a webhook URL for a Twilio phone number. When an SMS or call is received, Twilio sends the details to this URL. Used to build SMS bots, auto-responders, and IVR systems.",
    inputSchema: z13.object({
      phoneSid: z13.string().describe("The Twilio phone number SID (PN...)"),
      smsUrl: z13.string().optional().describe("URL for incoming SMS webhook"),
      voiceUrl: z13.string().optional().describe("URL for incoming voice call webhook"),
      statusCallback: z13.string().optional().describe("URL for status callback webhook"),
      method: z13.enum(["GET", "POST"]).optional().describe("HTTP method for webhook calls. Defaults to POST.")
    }),
    provider: "twilio",
    execute: async (input, credentials) => {
      const body = {};
      if (input.smsUrl) body.SmsUrl = input.smsUrl;
      if (input.voiceUrl) body.VoiceUrl = input.voiceUrl;
      if (input.statusCallback) body.StatusCallback = input.statusCallback;
      if (input.method) body.SmsMethod = input.method;
      return apiClient("twilio", {
        method: "POST",
        path: `/Accounts/${credentials.accountSid}/IncomingPhoneNumbers/${input.phoneSid}.json`,
        body: Object.fromEntries(
          Object.entries(body).map(([k, v]) => [k, v])
        ),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }, credentials);
    }
  }
];

// src/mcp/tools/openai.ts
import { z as z14 } from "zod";
var openaiTools = [
  {
    name: "create_openai_api_key",
    description: "Create a new OpenAI API key via the platform API. API keys allow programmatic access to OpenAI models (GPT-4, DALL-E, Whisper, etc.). Returns the key value \u2014 store it immediately as it cannot be retrieved later.",
    inputSchema: z14.object({
      name: z14.string().describe("A descriptive name for this API key (e.g. 'production-app')"),
      scopes: z14.array(z14.string()).optional().describe("Permission scopes for the key. Defaults to all scopes.")
    }),
    provider: "openai",
    execute: async (input, credentials) => {
      const body = { name: input.name };
      if (input.scopes) body.scopes = input.scopes;
      return apiClient("openai", {
        method: "POST",
        path: "/organization/api_keys",
        body
      }, credentials);
    }
  },
  {
    name: "get_openai_usage",
    description: "Retrieve OpenAI API usage and billing information. Shows total usage, costs broken down by model, and current billing period details. Useful for monitoring spending.",
    inputSchema: z14.object({
      startDate: z14.string().optional().describe("Start date for usage query (YYYY-MM-DD). Defaults to current billing period start."),
      endDate: z14.string().optional().describe("End date for usage query (YYYY-MM-DD). Defaults to today.")
    }),
    provider: "openai",
    execute: async (input, credentials) => {
      const query = {};
      if (input.startDate) query.start_date = input.startDate;
      if (input.endDate) query.end_date = input.endDate;
      return apiClient("openai", {
        method: "GET",
        path: "/organization/usage",
        query: Object.keys(query).length > 0 ? query : void 0
      }, credentials);
    }
  },
  {
    name: "list_openai_models",
    description: "List all models available to your OpenAI account. Returns model IDs, creation dates, and ownership info. Use this to discover which models (GPT-4, GPT-3.5, DALL-E, etc.) you can access.",
    inputSchema: z14.object({}),
    provider: "openai",
    execute: async (_input, credentials) => {
      return apiClient("openai", {
        method: "GET",
        path: "/models"
      }, credentials);
    }
  }
];

// src/mcp/tools/anthropic.ts
import { z as z15 } from "zod";
var anthropicTools = [
  {
    name: "create_anthropic_api_key",
    description: "Create a new Anthropic API key via the Admin API. Keys can be scoped to specific workspaces or given full access. Returns the key value \u2014 it cannot be retrieved after creation.",
    inputSchema: z15.object({
      name: z15.string().describe("A descriptive name for this API key (e.g. 'prod-backend')"),
      workspaceId: z15.string().optional().describe("Workspace ID to scope the key to. If omitted, the key has org-wide access."),
      role: z15.enum(["admin", "developer", "viewer"]).optional().describe("Permission role for the key. Defaults to 'developer'.")
    }),
    provider: "anthropic",
    execute: async (input, credentials) => {
      const body = { name: input.name };
      if (input.workspaceId) body.workspace_id = input.workspaceId;
      if (input.role) body.role = input.role;
      return apiClient("anthropic", {
        method: "POST",
        path: "/organizations/api_keys",
        body
      }, credentials);
    }
  },
  {
    name: "get_anthropic_usage",
    description: "Retrieve Anthropic API usage and billing information. Shows token consumption and costs broken down by model (Claude Opus, Sonnet, Haiku) and time period.",
    inputSchema: z15.object({
      startDate: z15.string().optional().describe("Start date for usage query (YYYY-MM-DD). Defaults to current billing period."),
      endDate: z15.string().optional().describe("End date for usage query (YYYY-MM-DD). Defaults to today."),
      groupBy: z15.enum(["model", "date", "workspace"]).optional().describe("How to group usage data. Defaults to 'model'.")
    }),
    provider: "anthropic",
    execute: async (input, credentials) => {
      const query = {};
      if (input.startDate) query.start_date = input.startDate;
      if (input.endDate) query.end_date = input.endDate;
      if (input.groupBy) query.group_by = input.groupBy;
      return apiClient("anthropic", {
        method: "GET",
        path: "/organizations/usage",
        query: Object.keys(query).length > 0 ? query : void 0
      }, credentials);
    }
  }
];

// src/mcp/tools/replicate.ts
import { z as z16 } from "zod";
var replicateTools = [
  {
    name: "run_replicate_model",
    description: "Run a model on Replicate. Provide the model identifier (e.g. 'stability-ai/sdxl') and input parameters. Returns a prediction ID you can poll for results using get_replicate_prediction.",
    inputSchema: z16.object({
      model: z16.string().describe("Model identifier in 'owner/name' format (e.g. 'stability-ai/sdxl', 'meta/llama-3-70b')"),
      version: z16.string().optional().describe("Specific model version hash. If omitted, uses the latest version."),
      input: z16.record(z16.unknown()).describe("Model-specific input parameters (e.g. { prompt: 'a cat in space', width: 1024 })"),
      webhook: z16.string().optional().describe("URL to receive a POST when the prediction completes"),
      webhookEvents: z16.array(z16.enum(["start", "output", "logs", "completed"])).optional().describe("Which events trigger the webhook")
    }),
    provider: "replicate",
    execute: async (input, credentials) => {
      const body = {
        model: input.model,
        input: input.input
      };
      if (input.version) body.version = input.version;
      if (input.webhook) {
        body.webhook = input.webhook;
        if (input.webhookEvents) body.webhook_events_completed = input.webhookEvents;
      }
      return apiClient("replicate", {
        method: "POST",
        path: "/predictions",
        body
      }, credentials);
    }
  },
  {
    name: "get_replicate_prediction",
    description: "Get the status and output of a Replicate prediction. Poll this endpoint to check if a model run has completed. Returns the prediction status (starting, processing, succeeded, failed, canceled) and output data.",
    inputSchema: z16.object({
      predictionId: z16.string().describe("The prediction ID returned by run_replicate_model")
    }),
    provider: "replicate",
    execute: async (input, credentials) => {
      return apiClient("replicate", {
        method: "GET",
        path: `/predictions/${input.predictionId}`
      }, credentials);
    }
  },
  {
    name: "list_replicate_models",
    description: "List or search for models on Replicate. Returns model identifiers, descriptions, and URLs. Useful for discovering which AI models are available to run.",
    inputSchema: z16.object({
      query: z16.string().optional().describe("Search query to filter models (e.g. 'image generation', 'text to speech')"),
      limit: z16.number().optional().describe("Maximum number of results. Defaults to 20.")
    }),
    provider: "replicate",
    execute: async (input, credentials) => {
      const query = {};
      if (input.query) query.search = input.query;
      query.limit = String(input.limit ?? 20);
      return apiClient("replicate", {
        method: "GET",
        path: "/models",
        query
      }, credentials);
    }
  }
];

// src/mcp/tools/flyio.ts
import { z as z17 } from "zod";
var flyioTools = [
  {
    name: "create_fly_app",
    description: "Create a new Fly.io application. An app is a container for one or more services (machines) that run your code on Fly's edge network. Returns the app name and organization.",
    inputSchema: z17.object({
      name: z17.string().describe("App name (must be unique, lowercase, alphanumeric with hyphens)"),
      org: z17.string().optional().describe("Fly.io organization slug. Defaults to your personal org."),
      network: z17.string().optional().describe("Network to deploy on. Defaults to Fly's default network.")
    }),
    provider: "flyio",
    execute: async (input, credentials) => {
      const body = {
        app_name: input.name
      };
      if (input.org) body.org_slug = input.org;
      if (input.network) body.network = input.network;
      return apiClient("flyio", {
        method: "POST",
        path: "/apps",
        body
      }, credentials);
    }
  },
  {
    name: "deploy_to_fly",
    description: "Deploy a machine to a Fly.io app. Machines are lightweight VMs running Docker containers. Provide the Docker image and configuration for the deployment.",
    inputSchema: z17.object({
      appName: z17.string().describe("The Fly.io app name"),
      image: z17.string().describe("Docker image to deploy (e.g. 'registry.fly.io/myapp:latest' or 'nginx:latest')"),
      region: z17.string().optional().describe("Fly region code (e.g. 'sjc', 'lhr', 'nrt'). Defaults to nearest."),
      memory: z17.number().optional().describe("Memory in MB. Defaults to 256."),
      cpuCount: z17.number().optional().describe("Number of CPUs. Defaults to 1."),
      env: z17.record(z17.string(), z17.string()).optional().describe("Environment variables for the machine"),
      services: z17.array(z17.object({
        port: z17.number().describe("Internal port the service listens on"),
        protocol: z17.enum(["tcp", "udp"]).optional().describe("Protocol. Defaults to tcp."),
        externalPort: z17.number().optional().describe("External port. Defaults to same as internal port.")
      })).optional().describe("Network services to expose (ports)")
    }),
    provider: "flyio",
    execute: async (input, credentials) => {
      const body = {
        config: {
          image: input.image
        }
      };
      const config = body.config;
      if (input.region) config.region = input.region;
      if (input.memory) config.memory = input.memory;
      if (input.cpuCount) config.cpus = input.cpuCount;
      if (input.env) config.env = input.env;
      if (input.services) {
        config.services = input.services.map((s) => ({
          internal_port: s.port,
          protocol: s.protocol ?? "tcp",
          ...s.externalPort ? { external_port: s.externalPort } : {}
        }));
      }
      return apiClient("flyio", {
        method: "POST",
        path: `/apps/${input.appName}/machines`,
        body
      }, credentials);
    }
  },
  {
    name: "set_fly_secrets",
    description: "Set secrets (encrypted environment variables) on a Fly.io app. These are injected into machine environment at runtime and are never stored in plaintext.",
    inputSchema: z17.object({
      appName: z17.string().describe("The Fly.io app name"),
      secrets: z17.record(z17.string(), z17.string()).describe("Key-value pairs of secrets to set (e.g. { DATABASE_URL: 'postgres://...', API_KEY: 'sk_...' })")
    }),
    provider: "flyio",
    execute: async (input, credentials) => {
      return apiClient("flyio", {
        method: "POST",
        path: `/apps/${input.appName}/secrets`,
        body: { secrets: input.secrets }
      }, credentials);
    }
  },
  {
    name: "get_fly_status",
    description: "Get the status of a Fly.io app including its machines, their health, regions, and allocated resources. Useful for monitoring deployment health.",
    inputSchema: z17.object({
      appName: z17.string().describe("The Fly.io app name")
    }),
    provider: "flyio",
    execute: async (input, credentials) => {
      return apiClient("flyio", {
        method: "GET",
        path: `/apps/${input.appName}`
      }, credentials);
    }
  }
];

// src/mcp/tools/awsamplify.ts
import { z as z18 } from "zod";
var awsAmplifyTools = [
  {
    name: "create_amplify_app",
    description: "Create a new AWS Amplify application. Amplify provides hosting for static sites and SSR apps, with CI/CD from Git repositories. Returns the app ID and ARN.",
    inputSchema: z18.object({
      name: z18.string().describe("Name for the Amplify app"),
      repository: z18.string().optional().describe("Git repository URL for CI/CD (e.g. 'https://github.com/user/repo')"),
      platform: z18.enum(["WEB", "WEB_COMPUTE"]).optional().describe("Platform type. 'WEB' for static sites, 'WEB_COMPUTE' for SSR (Next.js, Nuxt). Defaults to 'WEB_COMPUTE'."),
      buildSpec: z18.string().optional().describe("Amplify build specification YAML. If omitted, auto-detection is used."),
      environmentVariables: z18.record(z18.string(), z18.string()).optional().describe("Environment variables for the build")
    }),
    provider: "awsamplify",
    execute: async (input, credentials) => {
      const body = {
        name: input.name,
        platform: input.platform ?? "WEB_COMPUTE"
      };
      if (input.repository) body.repository = input.repository;
      if (input.buildSpec) body.buildSpec = input.buildSpec;
      if (input.environmentVariables) body.environmentVariables = input.environmentVariables;
      return apiClient("awsamplify", {
        method: "POST",
        path: "/apps",
        body
      }, credentials);
    }
  },
  {
    name: "deploy_amplify_branch",
    description: "Create or trigger a deployment for a branch on an AWS Amplify app. This starts a new build and deployment from the connected repository for the specified branch.",
    inputSchema: z18.object({
      appId: z18.string().describe("Amplify app ID"),
      branchName: z18.string().describe("Branch name to deploy (e.g. 'main', 'staging', 'feature/login')"),
      stage: z18.enum(["PULL_REQUEST", "BETA", "PRODUCTION", "DEVELOPMENT", "EXPERIMENTAL"]).optional().describe("Deployment stage. Defaults to 'PRODUCTION' for main, 'BETA' for others."),
      enableAutoBuild: z18.boolean().optional().describe("Enable auto-build on push. Defaults to true."),
      environmentVariables: z18.record(z18.string(), z18.string()).optional().describe("Branch-specific environment variables")
    }),
    provider: "awsamplify",
    execute: async (input, credentials) => {
      const body = {
        branchName: input.branchName,
        stage: input.stage ?? "PRODUCTION",
        enableAutoBuild: input.enableAutoBuild ?? true
      };
      if (input.environmentVariables) body.environmentVariables = input.environmentVariables;
      return apiClient("awsamplify", {
        method: "POST",
        path: `/apps/${input.appId}/branches`,
        body
      }, credentials);
    }
  },
  {
    name: "get_amplify_url",
    description: "Get the deployment URL for an AWS Amplify app branch. Returns the live URL where the app is accessible, along with deployment status and timestamps.",
    inputSchema: z18.object({
      appId: z18.string().describe("Amplify app ID"),
      branchName: z18.string().optional().describe("Branch name. Defaults to 'main'.")
    }),
    provider: "awsamplify",
    execute: async (input, credentials) => {
      const branch = input.branchName ?? "main";
      return apiClient("awsamplify", {
        method: "GET",
        path: `/apps/${input.appId}/branches/${branch}`
      }, credentials);
    }
  }
];

// src/mcp/registry.ts
function loadAllTools() {
  return [
    ...supabaseTools,
    ...stripeTools,
    ...railwayTools,
    ...vercelTools,
    ...clerkTools,
    ...resendTools,
    ...neonTools,
    ...upstashTools,
    ...githubTools,
    ...cloudflareTools,
    ...firebaseTools,
    ...loopsTools,
    ...twilioTools,
    ...openaiTools,
    ...anthropicTools,
    ...replicateTools,
    ...flyioTools,
    ...awsAmplifyTools
  ];
}

// src/cli/check.ts
var __filename3 = fileURLToPath2(import.meta.url);
var __dirname3 = dirname2(__filename3);
async function validateProvider(provider) {
  try {
    switch (provider) {
      case "supabase":
        await apiRequest(provider, { method: "GET", path: "/projects" });
        break;
      case "railway":
        await apiRequest(provider, {
          method: "POST",
          path: "/",
          body: { query: "query { projects { id } }" }
        });
        break;
      case "vercel":
        await apiRequest(provider, { method: "GET", path: "/projects" });
        break;
      case "stripe":
        await apiRequest(provider, { method: "GET", path: "/account" });
        break;
      case "clerk":
        await apiRequest(provider, { method: "GET", path: "/applications" });
        break;
      case "resend":
        await apiRequest(provider, { method: "GET", path: "/domains" });
        break;
      case "neon":
        await apiRequest(provider, { method: "GET", path: "/projects" });
        break;
      case "upstash":
        await apiRequest(provider, { method: "GET", path: "/redis" });
        break;
      case "github":
        await apiRequest(provider, { method: "GET", path: "/user" });
        break;
      case "cloudflare":
        await apiRequest(provider, { method: "GET", path: "/zones" });
        break;
      case "firebase":
        await apiRequest(provider, { method: "GET", path: "/projects" });
        break;
      case "loops":
        await apiRequest(provider, { method: "GET", path: "/api-key" });
        break;
      case "twilio": {
        const credentials = await getKeychainCredentials(provider);
        if (!credentials) return false;
        await apiRequest(provider, {
          method: "GET",
          path: `/Accounts/${credentials.accountSid}/IncomingPhoneNumbers.json`
        });
        break;
      }
      case "openai":
        await apiRequest(provider, { method: "GET", path: "/models" });
        break;
      case "anthropic":
        await apiRequest(provider, { method: "GET", path: "/organizations/usage" });
        break;
      case "replicate":
        await apiRequest(provider, { method: "GET", path: "/models" });
        break;
      case "flyio":
        await apiRequest(provider, { method: "GET", path: "/apps" });
        break;
      case "awsamplify":
        await apiRequest(provider, { method: "GET", path: "/apps" });
        break;
      default:
        return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}
function registerCheckCommand(program2) {
  program2.command("check").description("Validate that the MCP server and connected providers are configured correctly").action(async () => {
    logger.heading("Conjra Self-Check");
    const serverPath = join4(__dirname3, "..", "mcp", "server.js");
    if (existsSync4(serverPath)) {
      logger.success("MCP server is built and ready");
    } else {
      logger.error(`MCP server build not found at: ${serverPath}`);
      logger.dim("Run `npm run build` to compile the MCP server first.");
    }
    let toolsCount = 0;
    try {
      const tools = loadAllTools();
      toolsCount = tools.length;
      logger.success(`Loaded ${toolsCount} MCP tools successfully`);
    } catch (err) {
      logger.error(`Failed to load MCP tools: ${err.message}`);
    }
    const connected = await listConnectedProviders();
    if (connected.length === 0) {
      logger.warn("No providers connected. Run `conjra add <provider>` to connect one.");
    } else {
      console.log("");
      logger.info(`Validating ${connected.length} connected provider(s):`);
      const allTools = loadAllTools();
      for (const provider of connected) {
        const toolsForProvider = allTools.filter((t) => t.provider === provider);
        const toolsText = `${toolsForProvider.length} tools available`;
        const isValid = await validateProvider(provider);
        if (isValid) {
          console.log(`  ${chalk7.green("\u2714")} ${chalk7.bold(provider)} connected (${chalk7.green("token valid")}) \u2014 ${toolsText}`);
        } else {
          console.log(`  ${chalk7.red("\u2716")} ${chalk7.bold(provider)} connection failed (${chalk7.red("token invalid or network issue")}) \u2014 ${toolsText}`);
        }
      }
    }
    console.log("");
  });
}

// src/cli/index.ts
var program = new Command();
program.name("conjra").description("Provision cloud infrastructure from your editor via MCP").version("1.0.0");
registerInitCommand(program);
registerAddCommand(program);
registerRemoveCommand(program);
registerStatusCommand(program);
registerGetTokenCommand(program);
registerCheckCommand(program);
program.parse();
