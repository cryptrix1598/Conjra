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

// src/cli/init.ts
var VALID_EDITORS = ["claude", "cursor", "windsurf"];
function getServerConfig() {
  const serverPath = join(process.cwd(), "dist", "mcp", "server.js");
  return {
    command: "node",
    args: [serverPath]
  };
}
function registerClaude(serverConfig) {
  const settingsPath = join(homedir(), ".claude", "settings.json");
  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      const raw = readFileSync(settingsPath, { encoding: "utf8" });
      settings = JSON.parse(raw);
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
  logger.success(`Registered conjra MCP server in ${chalk2.cyan(settingsPath)}`);
}
function registerCursor(serverConfig) {
  const configPath = join(process.cwd(), ".cursor", "mcp.json");
  let config = {};
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, { encoding: "utf8" });
      config = JSON.parse(raw);
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
  logger.success(`Registered conjra MCP server in ${chalk2.cyan(configPath)}`);
}
function registerWindsurf(serverConfig) {
  const configPath = join(process.cwd(), ".windsurf", "mcp.json");
  let config = {};
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, { encoding: "utf8" });
      config = JSON.parse(raw);
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
  logger.success(`Registered conjra MCP server in ${chalk2.cyan(configPath)}`);
}
function registerInitCommand(program2) {
  program2.command("init").description("Initialize conjra for your AI editor").requiredOption("--ai <editor>", `AI editor to configure (${VALID_EDITORS.join(", ")})`).action(async (opts) => {
    const editor = opts.ai.toLowerCase();
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
    logger.bullet("3.", `Start coding!   Ask Claude to use conjra tools.`);
    console.log("");
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
function checkMCPServerRegistration() {
  const claudeSettingsPath = join3(homedir3(), ".claude", "settings.json");
  if (existsSync3(claudeSettingsPath)) {
    try {
      const raw = readFileSync3(claudeSettingsPath, { encoding: "utf8" });
      const settings = JSON.parse(raw);
      if (settings.mcpServers?.["conjra"]) {
        return { registered: true, location: claudeSettingsPath };
      }
    } catch {
    }
  }
  const cursorConfigPath = join3(process.cwd(), ".cursor", "mcp.json");
  if (existsSync3(cursorConfigPath)) {
    try {
      const raw = readFileSync3(cursorConfigPath, { encoding: "utf8" });
      const config = JSON.parse(raw);
      if (config["conjra"]) {
        return { registered: true, location: cursorConfigPath };
      }
    } catch {
    }
  }
  const windsurfConfigPath = join3(process.cwd(), ".windsurf", "mcp.json");
  if (existsSync3(windsurfConfigPath)) {
    try {
      const raw = readFileSync3(windsurfConfigPath, { encoding: "utf8" });
      const config = JSON.parse(raw);
      if (config["conjra"]) {
        return { registered: true, location: windsurfConfigPath };
      }
    } catch {
    }
  }
  return { registered: false, location: null };
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
    const mcpStatus = checkMCPServerRegistration();
    if (mcpStatus.registered && mcpStatus.location) {
      logger.info(`MCP server: ${chalk5.green("registered")} in ${chalk5.cyan(mcpStatus.location)}`);
    } else {
      logger.warn("MCP server: not registered");
      logger.dim(`Run ${chalk5.cyan("conjra init --ai claude")} to register.`);
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
