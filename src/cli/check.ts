import { Command } from "commander";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { listConnectedProviders, getKeychainCredentials } from "../auth/keychain.js";
import { apiRequest } from "../api/client.js";
import { loadAllTools } from "../mcp/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function validateProvider(provider: string): Promise<boolean> {
  try {
    switch (provider) {
      case "supabase":
        await apiRequest(provider, { method: "GET", path: "/projects" });
        break;
      case "railway":
        await apiRequest(provider, {
          method: "POST",
          path: "/",
          body: { query: "query { projects { id } }" },
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
        // Upstash Redis list
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
          path: `/Accounts/${credentials.accountSid}/IncomingPhoneNumbers.json`,
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
  } catch (err: any) {
    // If auth fails or endpoint error, we return false
    return false;
  }
}

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description("Validate that the MCP server and connected providers are configured correctly")
    .action(async () => {
      logger.heading("Conjra Self-Check");

      // 1. Verify MCP Server is built/available
      const serverPath = join(__dirname, "..", "mcp", "server.js");
      if (existsSync(serverPath)) {
        logger.success("MCP server is built and ready");
      } else {
        logger.error(`MCP server build not found at: ${serverPath}`);
        logger.dim("Run `npm run build` to compile the MCP server first.");
      }

      // 2. Load and count tools
      let toolsCount = 0;
      try {
        const tools = loadAllTools();
        toolsCount = tools.length;
        logger.success(`Loaded ${toolsCount} MCP tools successfully`);
      } catch (err: any) {
        logger.error(`Failed to load MCP tools: ${err.message}`);
      }

      // 3. Check connected providers
      const connected = await listConnectedProviders();
      if (connected.length === 0) {
        logger.warn("No providers connected. Run `conjra add <provider>` to connect one.");
      } else {
        console.log("");
        logger.info(`Validating ${connected.length} connected provider(s):`);
        
        const allTools = loadAllTools();
        for (const provider of connected) {
          const toolsForProvider = allTools.filter(t => t.provider === provider);
          const toolsText = `${toolsForProvider.length} tools available`;

          const isValid = await validateProvider(provider);
          if (isValid) {
            console.log(`  ${chalk.green("✔")} ${chalk.bold(provider)} connected (${chalk.green("token valid")}) — ${toolsText}`);
          } else {
            console.log(`  ${chalk.red("✖")} ${chalk.bold(provider)} connection failed (${chalk.red("token invalid or network issue")}) — ${toolsText}`);
          }
        }
      }
      console.log("");
    });
}
