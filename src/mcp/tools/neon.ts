import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const neonTools: MCPTool[] = [
  {
    name: "create_neon_project",
    description:
      "Create a new Neon PostgreSQL project. Neon provides serverless Postgres with auto-scaling and branching. Returns the project ID, connection string, and default branch info.",
    inputSchema: z.object({
      name: z.string().describe("Project name"),
      regionId: z.string().optional().describe("AWS region ID (e.g. aws-us-east-1, aws-eu-west-1). Defaults to aws-us-east-1."),
      pgVersion: z.number().optional().describe("PostgreSQL version (15 or 16). Defaults to 16."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = { project: { name: input.name } };
      if (input.regionId) (body.project as Record<string, unknown>).region_id = input.regionId;
      if (input.pgVersion !== undefined) (body.project as Record<string, unknown>).pg_version = input.pgVersion;

      return apiClient("neon", {
        method: "POST",
        path: "/projects",
        body,
      }, credentials);
    },
  },
  {
    name: "create_neon_branch",
    description:
      "Create a branch in a Neon project. Branching lets you create a copy of your database for development, testing, or preview environments. Data is isolated per branch.",
    inputSchema: z.object({
      projectId: z.string().describe("The Neon project ID"),
      branchName: z.string().describe("Name for the new branch (e.g. 'preview', 'staging')"),
      parentBranchId: z.string().optional().describe("ID of the parent branch to branch from. Defaults to the primary branch."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        branch: { name: input.branchName },
      };
      if (input.parentBranchId) (body.branch as Record<string, unknown>).parent_id = input.parentBranchId;

      return apiClient("neon", {
        method: "POST",
        path: `/projects/${input.projectId}/branches`,
        body,
      }, credentials);
    },
  },
  {
    name: "get_neon_connection_string",
    description:
      "Retrieve the PostgreSQL connection string for a Neon project branch. This is the URI you use in your application's DATABASE_URL environment variable.",
    inputSchema: z.object({
      projectId: z.string().describe("The Neon project ID"),
      branchId: z.string().optional().describe("Branch ID. Defaults to the primary branch."),
      databaseName: z.string().optional().describe("Database name. Defaults to 'neondb'."),
      roleName: z.string().optional().describe("Role name. Defaults to the project owner."),
    }),
    execute: async (input, credentials) => {
      const query: Record<string, string> = {};
      if (input.branchId) query.branch_id = input.branchId;
      if (input.databaseName) query.database_name = input.databaseName;
      if (input.roleName) query.role_name = input.roleName;

      return apiClient("neon", {
        method: "GET",
        path: `/projects/${input.projectId}/connection_string`,
        query: Object.keys(query).length > 0 ? query : undefined,
      }, credentials);
    },
  },
];