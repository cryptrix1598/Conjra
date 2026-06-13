import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const clerkTools: MCPTool[] = [
  {
    name: "create_clerk_app",
    description:
      "Create a new Clerk application instance. A Clerk app manages authentication (sign-in, sign-up, user management) for your application. Returns the app ID and instance URL.",
    inputSchema: z.object({
      name: z.string().describe("Name for the Clerk application"),
    }),
    execute: async (input, credentials) => {
      return apiClient("clerk", {
        method: "POST",
        path: "/applications",
        body: { name: input.name },
      }, credentials);
    },
  },
  {
    name: "get_clerk_keys",
    description:
      "Retrieve the API keys for a Clerk application instance. Returns the publishable key (for frontend) and secret key (for backend). These are needed to integrate Clerk into your app.",
    inputSchema: z.object({
      instanceId: z.string().describe("Clerk instance ID"),
    }),
    execute: async (input, credentials) => {
      return apiClient("clerk", {
        method: "GET",
        path: `/instances/${input.instanceId}/api_keys`,
      }, credentials);
    },
  },
  {
    name: "configure_clerk_jwt",
    description:
      "Configure the JWT template for a Clerk instance. This controls the claims included in session tokens, which your backend uses to verify authentication. Returns the updated JWT template.",
    inputSchema: z.object({
      instanceId: z.string().describe("Clerk instance ID"),
      templateName: z.string().describe("Name for the JWT template (e.g. 'default', 'supabase')"),
      claims: z.record(z.string(), z.string()).optional().describe("Custom claims to include in the JWT payload (e.g. { 'sub': '{{user.id}}', 'email': '{{user.primary_email_address}}' })"),
      lifetime: z.number().optional().describe("Token lifetime in seconds. Defaults to 60."),
      allowedClockSkew: z.number().optional().describe("Allowed clock skew in seconds. Defaults to 5."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        name: input.templateName,
      };
      if (input.claims) body.claims = input.claims;
      if (input.lifetime !== undefined) body.lifetime = input.lifetime;
      if (input.allowedClockSkew !== undefined) body.allowed_clock_skew = input.allowedClockSkew;

      return apiClient("clerk", {
        method: "POST",
        path: `/instances/${input.instanceId}/jwt_templates`,
        body,
      }, credentials);
    },
  },
];