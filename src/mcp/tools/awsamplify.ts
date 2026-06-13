import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const awsAmplifyTools: MCPTool[] = [
  {
    name: "create_amplify_app",
    description:
      "Create a new AWS Amplify application. Amplify provides hosting for static sites and SSR apps, with CI/CD from Git repositories. Returns the app ID and ARN.",
    inputSchema: z.object({
      name: z.string().describe("Name for the Amplify app"),
      repository: z.string().optional().describe("Git repository URL for CI/CD (e.g. 'https://github.com/user/repo')"),
      platform: z.enum(["WEB", "WEB_COMPUTE"]).optional().describe("Platform type. 'WEB' for static sites, 'WEB_COMPUTE' for SSR (Next.js, Nuxt). Defaults to 'WEB_COMPUTE'."),
      buildSpec: z.string().optional().describe("Amplify build specification YAML. If omitted, auto-detection is used."),
      environmentVariables: z.record(z.string(), z.string()).optional().describe("Environment variables for the build"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        name: input.name,
        platform: input.platform ?? "WEB_COMPUTE",
      };
      if (input.repository) body.repository = input.repository;
      if (input.buildSpec) body.buildSpec = input.buildSpec;
      if (input.environmentVariables) body.environmentVariables = input.environmentVariables;

      return apiClient("awsamplify", {
        method: "POST",
        path: "/apps",
        body,
      }, credentials);
    },
  },
  {
    name: "deploy_amplify_branch",
    description:
      "Create or trigger a deployment for a branch on an AWS Amplify app. This starts a new build and deployment from the connected repository for the specified branch.",
    inputSchema: z.object({
      appId: z.string().describe("Amplify app ID"),
      branchName: z.string().describe("Branch name to deploy (e.g. 'main', 'staging', 'feature/login')"),
      stage: z.enum(["PULL_REQUEST", "BETA", "PRODUCTION", "DEVELOPMENT", "EXPERIMENTAL"]).optional().describe("Deployment stage. Defaults to 'PRODUCTION' for main, 'BETA' for others."),
      enableAutoBuild: z.boolean().optional().describe("Enable auto-build on push. Defaults to true."),
      environmentVariables: z.record(z.string(), z.string()).optional().describe("Branch-specific environment variables"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        branchName: input.branchName,
        stage: input.stage ?? "PRODUCTION",
        enableAutoBuild: input.enableAutoBuild ?? true,
      };
      if (input.environmentVariables) body.environmentVariables = input.environmentVariables;

      return apiClient("awsamplify", {
        method: "POST",
        path: `/apps/${input.appId}/branches`,
        body,
      }, credentials);
    },
  },
  {
    name: "get_amplify_url",
    description:
      "Get the deployment URL for an AWS Amplify app branch. Returns the live URL where the app is accessible, along with deployment status and timestamps.",
    inputSchema: z.object({
      appId: z.string().describe("Amplify app ID"),
      branchName: z.string().optional().describe("Branch name. Defaults to 'main'."),
    }),
    execute: async (input, credentials) => {
      const branch = input.branchName ?? "main";
      return apiClient("awsamplify", {
        method: "GET",
        path: `/apps/${input.appId}/branches/${branch}`,
      }, credentials);
    },
  },
];