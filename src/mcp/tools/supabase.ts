import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const supabaseTools: MCPTool[] = [
  {
    name: "create_supabase_project",
    description:
      "Create a new Supabase project. Returns the project ID, database URL, anon key, and service role key. Use this when the user wants to set up a new Supabase backend for their application.",
    inputSchema: z.object({
      name: z.string().describe("Human-readable project name"),
      organizationId: z.string().optional().describe("Supabase organization ID. If not provided, the default org is used."),
      region: z.string().optional().describe("AWS region for the project (e.g. us-east-1, eu-west-1). Defaults to us-east-1."),
      dbPassword: z.string().describe("Password for the PostgreSQL database (min 8 characters)"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        name: input.name,
        db_pass: input.dbPassword,
        region: input.region ?? "us-east-1",
      };
      if (input.organizationId) {
        body.organization_id = input.organizationId;
      }
      return apiClient("supabase", {
        method: "POST",
        path: "/projects",
        body,
      }, credentials);
    },
  },
  {
    name: "run_supabase_migration",
    description:
      "Execute a SQL migration on a Supabase project. Use this to create tables, add columns, enable RLS policies, or any other DDL/DML operation. The SQL is run against the project's PostgreSQL database.",
    inputSchema: z.object({
      projectId: z.string().describe("The Supabase project reference ID"),
      sql: z.string().describe("The SQL migration to execute"),
      name: z.string().describe("A descriptive name for this migration"),
    }),
    execute: async (input, credentials) => {
      return apiClient("supabase", {
        method: "POST",
        path: `/projects/${input.projectId}/database/migrations`,
        body: {
          name: input.name,
          query: input.sql,
        },
      }, credentials);
    },
  },
  {
    name: "get_supabase_url_and_keys",
    description:
      "Retrieve the API URL, anon key, and service role key for a Supabase project. Use this to get the environment variables needed to connect a frontend or backend to Supabase.",
    inputSchema: z.object({
      projectId: z.string().describe("The Supabase project reference ID"),
    }),
    execute: async (input, credentials) => {
      const project = await apiClient<Record<string, unknown>>("supabase", {
        method: "GET",
        path: `/projects/${input.projectId}`,
      }, credentials);

      const keys = await apiClient<Array<Record<string, unknown>>>("supabase", {
        method: "GET",
        path: `/projects/${input.projectId}/api-keys`,
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
          region: project.region,
        },
      };
    },
  },
  {
    name: "create_supabase_bucket",
    description:
      "Create a new storage bucket in a Supabase project. Storage buckets hold files (images, documents, etc.) that can be accessed via the Supabase Storage API.",
    inputSchema: z.object({
      projectId: z.string().describe("The Supabase project reference ID"),
      bucketId: z.string().describe("Unique identifier for the bucket (lowercase, no spaces)"),
      name: z.string().optional().describe("Display name for the bucket. Defaults to bucketId."),
      public: z.boolean().optional().describe("Whether the bucket should be publicly accessible. Defaults to false."),
      fileSizeLimit: z.number().optional().describe("Maximum file size in bytes. Defaults to no limit."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        id: input.bucketId,
        name: input.name ?? input.bucketId,
        public: input.public ?? false,
      };
      if (input.fileSizeLimit !== undefined) {
        body.file_size_limit = input.fileSizeLimit;
      }
      return apiClient("supabase", {
        method: "POST",
        path: `/projects/${input.projectId}/storage/buckets`,
        body,
      }, credentials);
    },
  },
];