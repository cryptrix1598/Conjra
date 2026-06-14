#!/usr/bin/env node

// src/cli/index.ts
import { Command } from "commander";

// src/cli/init.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
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
function getServerConfig() {
  const serverPath = join(process.cwd(), "dist", "mcp", "server.js");
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

// src/cli/index.ts
var program = new Command();
program.name("conjra").description("Provision cloud infrastructure from your editor via MCP").version("1.0.0");
registerInitCommand(program);
registerAddCommand(program);
registerRemoveCommand(program);
registerStatusCommand(program);
program.parse();
