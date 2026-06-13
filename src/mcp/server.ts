#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodTypeAny } from "zod";
import { loadAllTools } from "./registry.js";
import { getKeychainCredentials } from "../auth/keychain.js";
import { APIError, AuthError, ProviderNotConnectedError } from "../api/errors.js";

async function startServer(): Promise<void> {
  const allTools = loadAllTools();

  const server = new McpServer({
    name: "conjra",
    version: "1.0.0",
  });

  for (const tool of allTools) {
    // Convert Zod schema shape to the format McpServer.tool() expects
    const schemaShape = extractSchemaShape(tool.inputSchema);

    server.tool(
      tool.name,
      tool.description,
      schemaShape,
      async (input: Record<string, unknown>) => {
        const parts = tool.name.split("_");
        const providerName = parts[parts.length - 1];

        const credentials = await getKeychainCredentials(providerName);
        if (!credentials) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Provider "${providerName}" is not connected. Tell the user to run: conjra add ${providerName}`,
              },
            ],
            isError: true,
          };
        }

        try {
          const parsed = tool.inputSchema.parse(input);
          const result = await tool.execute(parsed, credentials);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (err: unknown) {
          let errorMessage: string;
          if (err instanceof APIError) {
            errorMessage = err.toString();
          } else if (err instanceof AuthError) {
            errorMessage = `Authentication failed for ${err.provider}: ${err.message}`;
          } else if (err instanceof ProviderNotConnectedError) {
            errorMessage = err.message;
          } else {
            errorMessage = err instanceof Error ? err.message : String(err);
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Error executing ${tool.name}: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Extract the shape from a ZodObject schema for use with McpServer.tool().
 * The McpServer.tool() method expects a Record<string, ZodTypeAny> representing
 * the individual fields of the input schema.
 */
function extractSchemaShape(schema: ZodTypeAny): Record<string, ZodTypeAny> {
  if (schema instanceof z.ZodObject) {
    return schema.shape as Record<string, ZodTypeAny>;
  }
  return {};
}

startServer().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Conjra MCP server failed to start:", message);
  process.exit(1);
});