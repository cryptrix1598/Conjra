import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const anthropicTools: MCPTool[] = [
  {
    name: "create_anthropic_api_key",
    description:
      "Create a new Anthropic API key via the Admin API. Keys can be scoped to specific workspaces or given full access. Returns the key value — it cannot be retrieved after creation.",
    inputSchema: z.object({
      name: z.string().describe("A descriptive name for this API key (e.g. 'prod-backend')"),
      workspaceId: z.string().optional().describe("Workspace ID to scope the key to. If omitted, the key has org-wide access."),
      role: z.enum(["admin", "developer", "viewer"]).optional().describe("Permission role for the key. Defaults to 'developer'."),
    }),
    provider: "anthropic",
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = { name: input.name };
      if (input.workspaceId) body.workspace_id = input.workspaceId;
      if (input.role) body.role = input.role;

      return apiClient("anthropic", {
        method: "POST",
        path: "/organizations/api_keys",
        body,
      }, credentials);
    },
  },
  {
    name: "get_anthropic_usage",
    description:
      "Retrieve Anthropic API usage and billing information. Shows token consumption and costs broken down by model (Claude Opus, Sonnet, Haiku) and time period.",
    inputSchema: z.object({
      startDate: z.string().optional().describe("Start date for usage query (YYYY-MM-DD). Defaults to current billing period."),
      endDate: z.string().optional().describe("End date for usage query (YYYY-MM-DD). Defaults to today."),
      groupBy: z.enum(["model", "date", "workspace"]).optional().describe("How to group usage data. Defaults to 'model'."),
    }),
    provider: "anthropic",
    execute: async (input, credentials) => {
      const query: Record<string, string> = {};
      if (input.startDate) query.start_date = input.startDate;
      if (input.endDate) query.end_date = input.endDate;
      if (input.groupBy) query.group_by = input.groupBy;

      return apiClient("anthropic", {
        method: "GET",
        path: "/organizations/usage",
        query: Object.keys(query).length > 0 ? query : undefined,
      }, credentials);
    },
  },
];