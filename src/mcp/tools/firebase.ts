import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const firebaseTools: MCPTool[] = [
  {
    name: "create_firebase_project",
    description:
      "Create a new Firebase project via the Google Cloud Platform. Firebase projects use GCP under the hood. Returns the project ID, display name, and project number.",
    inputSchema: z.object({
      projectId: z.string().describe("Globally unique project ID (lowercase, 6-30 chars, alphanumeric plus hyphens)"),
      displayName: z.string().optional().describe("Human-readable project name. Defaults to projectId."),
    }),
    provider: "firebase",
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        projectId: input.projectId,
      };
      if (input.displayName) body.displayName = input.displayName;

      return apiClient("firebase", {
        method: "POST",
        path: "/projects",
        body,
      }, credentials);
    },
  },
  {
    name: "get_firebase_config",
    description:
      "Retrieve the Firebase client configuration for a project. This includes the API key, auth domain, project ID, storage bucket, messaging sender ID, and app ID — all the values needed for firebaseConfig in your frontend.",
    inputSchema: z.object({
      projectId: z.string().describe("The Firebase/GCP project ID"),
    }),
    provider: "firebase",
    execute: async (input, credentials) => {
      return apiClient("firebase", {
        method: "GET",
        path: `/projects/${input.projectId}/adminSdkConfig`,
      }, credentials);
    },
  },
  {
    name: "enable_firebase_auth",
    description:
      "Enable a Firebase Authentication provider for a project. After enabling, users can sign in using the specified method (email/password, Google, GitHub, etc.).",
    inputSchema: z.object({
      projectId: z.string().describe("The Firebase/GCP project ID"),
      providerId: z.enum([
        "password",
        "google.com",
        "github.com",
        "facebook.com",
        "twitter.com",
        "apple.com",
        "microsoft.com",
        "yahoo.com",
        "phone",
        "anonymous",
      ]).describe("The auth provider to enable"),
      clientId: z.string().optional().describe("OAuth client ID (required for Google, GitHub, Facebook, etc.)"),
      clientSecret: z.string().optional().describe("OAuth client secret (required for Google, GitHub, Facebook, etc.)"),
    }),
    provider: "firebase",
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {};
      if (input.clientId) body.clientId = input.clientId;
      if (input.clientSecret) body.clientSecret = input.clientSecret;

      return apiClient("firebase", {
        method: "PATCH",
        path: `/projects/${input.projectId}/config`,
        body: {
          signIn: {
            [input.providerId]: {
              enabled: true,
              ...body,
            },
          },
        },
      }, credentials);
    },
  },
];