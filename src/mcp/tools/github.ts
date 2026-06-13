import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const githubTools: MCPTool[] = [
  {
    name: "create_github_repo",
    description:
      "Create a new GitHub repository. Returns the repository URL, clone URL, and default branch name. Use this to set up a new project's code repository.",
    inputSchema: z.object({
      name: z.string().describe("Repository name (e.g. 'my-app')"),
      description: z.string().optional().describe("Repository description"),
      private: z.boolean().optional().describe("Whether the repo should be private. Defaults to true."),
      autoInit: z.boolean().optional().describe("Initialize with a README. Defaults to true."),
      org: z.string().optional().describe("Organization to create the repo under. If omitted, creates under your personal account."),
    }),
    execute: async (input, credentials) => {
      const path = input.org ? `/orgs/${input.org}/repos` : "/user/repos";
      const body: Record<string, unknown> = {
        name: input.name,
        private: input.private ?? true,
        auto_init: input.autoInit ?? true,
      };
      if (input.description) body.description = input.description;

      return apiClient("github", {
        method: "POST",
        path,
        body,
      }, credentials);
    },
  },
  {
    name: "add_github_secret",
    description:
      "Add or update a repository secret for GitHub Actions. These secrets are encrypted and available in your CI/CD workflows. The value must be base64-encoded and encrypted with the repo's public key.",
    inputSchema: z.object({
      owner: z.string().describe("Repository owner (username or org name)"),
      repo: z.string().describe("Repository name"),
      secretName: z.string().describe("Name of the secret (e.g. 'DEPLOY_KEY', 'API_TOKEN')"),
      secretValue: z.string().describe("The plaintext value of the secret. It will be encrypted automatically."),
    }),
    execute: async (input, credentials) => {
      // First get the repo's public key for encryption
      const pubkeyResponse = await apiClient<{ key: string; key_id: string }>("github", {
        method: "GET",
        path: `/repos/${input.owner}/${input.repo}/actions/secrets/public-key`,
      }, credentials);

      // Encrypt the secret value using the public key
      const { publicEncrypt, createPublicKey } = await import("node:crypto");
      const publicKey = createPublicKey({
        key: Buffer.from(pubkeyResponse.key, "base64"),
        format: "der",
        type: "spki",
      });

      const encrypted = publicEncrypt(
        {
          key: publicKey,
          padding: await import("node:crypto").then((c) => c.constants.RSA_PKCS1_PADDING),
        },
        Buffer.from(input.secretValue)
      ).toString("base64");

      return apiClient("github", {
        method: "PUT",
        path: `/repos/${input.owner}/${input.repo}/actions/secrets/${input.secretName}`,
        body: {
          encrypted_value: encrypted,
          key_id: pubkeyResponse.key_id,
        },
      }, credentials);
    },
  },
  {
    name: "create_github_webhook",
    description:
      "Create a webhook for a GitHub repository. Webhooks notify your server when events happen in the repo (pushes, PRs, issues, etc.). Returns the webhook configuration.",
    inputSchema: z.object({
      owner: z.string().describe("Repository owner (username or org name)"),
      repo: z.string().describe("Repository name"),
      url: z.string().describe("Payload URL where GitHub sends webhook events (must be HTTPS)"),
      events: z.array(z.string()).optional().describe("Events that trigger the webhook (e.g. ['push', 'pull_request']). Defaults to ['push']."),
      secret: z.string().optional().describe("Secret for webhook signature verification"),
      active: z.boolean().optional().describe("Whether the webhook is active. Defaults to true."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        name: "web",
        active: input.active ?? true,
        config: {
          url: input.url,
          content_type: "json",
          ...(input.secret ? { secret: input.secret } : {}),
        },
        events: input.events ?? ["push"],
      };

      return apiClient("github", {
        method: "POST",
        path: `/repos/${input.owner}/${input.repo}/hooks`,
        body,
      }, credentials);
    },
  },
];