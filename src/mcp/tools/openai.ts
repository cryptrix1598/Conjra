import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const openaiTools: MCPTool[] = [
  {
    name: "create_openai_api_key",
    description:
      "Create a new OpenAI API key via the platform API. API keys allow programmatic access to OpenAI models (GPT-4, DALL-E, Whisper, etc.). Returns the key value — store it immediately as it cannot be retrieved later.",
    inputSchema: z.object({
      name: z.string().describe("A descriptive name for this API key (e.g. 'production-app')"),
      scopes: z.array(z.string()).optional().describe("Permission scopes for the key. Defaults to all scopes."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = { name: input.name };
      if (input.scopes) body.scopes = input.scopes;

      return apiClient("openai", {
        method: "POST",
        path: "/organization/api_keys",
        body,
      }, credentials);
    },
  },
  {
    name: "get_openai_usage",
    description:
      "Retrieve OpenAI API usage and billing information. Shows total usage, costs broken down by model, and current billing period details. Useful for monitoring spending.",
    inputSchema: z.object({
      startDate: z.string().optional().describe("Start date for usage query (YYYY-MM-DD). Defaults to current billing period start."),
      endDate: z.string().optional().describe("End date for usage query (YYYY-MM-DD). Defaults to today."),
    }),
    execute: async (input, credentials) => {
      const query: Record<string, string> = {};
      if (input.startDate) query.start_date = input.startDate;
      if (input.endDate) query.end_date = input.endDate;

      return apiClient("openai", {
        method: "GET",
        path: "/organization/usage",
        query: Object.keys(query).length > 0 ? query : undefined,
      }, credentials);
    },
  },
  {
    name: "list_openai_models",
    description:
      "List all models available to your OpenAI account. Returns model IDs, creation dates, and ownership info. Use this to discover which models (GPT-4, GPT-3.5, DALL-E, etc.) you can access.",
    inputSchema: z.object({}),
    execute: async (_input, credentials) => {
      return apiClient("openai", {
        method: "GET",
        path: "/models",
      }, credentials);
    },
  },
];