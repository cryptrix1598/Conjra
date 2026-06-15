import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const vercelTools: MCPTool[] = [
  {
    name: "deploy_to_vercel",
    description:
      "Deploy a project to Vercel. Creates a new deployment from a Git repository or uploads files directly. Returns the deployment URL and status.",
    inputSchema: z.object({
      projectId: z.string().optional().describe("Vercel project ID. If omitted, a new project is created."),
      name: z.string().describe("Project name (used if creating a new project)"),
      gitRepository: z.string().optional().describe("Git repository URL (e.g. https://github.com/user/repo)"),
      gitBranch: z.string().optional().describe("Git branch to deploy. Defaults to main."),
      framework: z.string().optional().describe("Framework preset (nextjs, react, vite, nuxt, sveltekit, etc.)"),
      buildCommand: z.string().optional().describe("Custom build command (e.g. 'npm run build')"),
      outputDirectory: z.string().optional().describe("Output directory for build artifacts (e.g. 'dist', '.next')"),
      rootDirectory: z.string().optional().describe("Root directory of the project within the repo"),
    }),
    provider: "vercel",
    execute: async (input, credentials) => {
      if (input.projectId) {
        return apiClient("vercel", {
          method: "POST",
          path: "/deployments",
          body: {
            project: input.projectId,
            gitSource: input.gitRepository
              ? { url: input.gitRepository, ref: input.gitBranch ?? "main" }
              : undefined,
          },
        }, credentials);
      }

      return apiClient("vercel", {
        method: "POST",
        path: "/projects",
        body: {
          name: input.name,
          gitRepository: input.gitRepository
            ? { url: input.gitRepository }
            : undefined,
          framework: input.framework,
          buildCommand: input.buildCommand,
          outputDirectory: input.outputDirectory,
          rootDirectory: input.rootDirectory,
        },
      }, credentials);
    },
  },
  {
    name: "add_vercel_domain",
    description:
      "Add a custom domain to a Vercel project. The domain's DNS must be configured to point to Vercel before it will work. Returns the domain verification details.",
    inputSchema: z.object({
      projectId: z.string().describe("Vercel project ID"),
      domain: z.string().describe("The domain name to add (e.g. 'example.com' or 'app.example.com')"),
    }),
    provider: "vercel",
    execute: async (input, credentials) => {
      return apiClient("vercel", {
        method: "POST",
        path: `/projects/${input.projectId}/domains`,
        body: { name: input.domain },
      }, credentials);
    },
  },
  {
    name: "set_vercel_env",
    description:
      "Set an environment variable on a Vercel project. The variable can be scoped to Production, Preview, or Development environments. Existing variables with the same name are updated.",
    inputSchema: z.object({
      projectId: z.string().describe("Vercel project ID"),
      key: z.string().describe("Environment variable name (e.g. DATABASE_URL)"),
      value: z.string().describe("Environment variable value"),
      target: z.array(z.enum(["production", "preview", "development"])).optional().describe("Environments where this variable is available. Defaults to all three."),
      type: z.enum(["plain", "encrypted", "sensitive"]).optional().describe("Variable type. Defaults to 'plain'."),
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
          type: input.type ?? "plain",
        },
      }, credentials);
    },
  },
  {
    name: "get_vercel_deployment",
    description:
      "Get details about a Vercel deployment including its URL, status (ready, building, error), and build logs URL.",
    inputSchema: z.object({
      deploymentId: z.string().describe("Vercel deployment ID"),
    }),
    provider: "vercel",
    execute: async (input, credentials) => {
      return apiClient("vercel", {
        method: "GET",
        path: `/deployments/${input.deploymentId}`,
      }, credentials);
    },
  },
];