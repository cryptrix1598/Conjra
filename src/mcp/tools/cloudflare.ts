import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const cloudflareTools: MCPTool[] = [
  {
    name: "add_cloudflare_domain",
    description:
      "Add a domain to Cloudflare for DNS management and CDN. After adding, you must update the domain's nameservers at your registrar to Cloudflare's assigned nameservers.",
    inputSchema: z.object({
      domain: z.string().describe("The domain name to add (e.g. 'example.com')"),
      type: z.enum(["full", "partial"]).optional().describe("'full' for full setup (DNS + proxy), 'partial' for CNAME setup. Defaults to 'full'."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        name: input.domain,
        type: input.type ?? "full",
      };

      return apiClient("cloudflare", {
        method: "POST",
        path: "/zones",
        body,
      }, credentials);
    },
  },
  {
    name: "create_cloudflare_worker",
    description:
      "Create or update a Cloudflare Worker script. Workers run serverless functions at the edge. Provide the JavaScript/TypeScript source code and the worker name.",
    inputSchema: z.object({
      workerName: z.string().describe("Name for the Worker (e.g. 'api-proxy', 'redirect-handler')"),
      script: z.string().describe("The Worker's JavaScript source code"),
      compatibilityDate: z.string().optional().describe("Compatibility date (e.g. '2024-01-01'). Defaults to current date."),
      compatibilityFlags: z.array(z.string()).optional().describe("Compatibility flags to enable"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        name: input.workerName,
        script: input.script,
        compatibility_date: input.compatibilityDate ?? new Date().toISOString().split("T")[0],
      };
      if (input.compatibilityFlags) body.compatibility_flags = input.compatibilityFlags;

      return apiClient("cloudflare", {
        method: "PUT",
        path: `/accounts/{account_id}/workers/scripts/${input.workerName}`,
        body,
      }, credentials);
    },
  },
  {
    name: "get_cloudflare_zone",
    description:
      "Get details about a Cloudflare zone (domain). Returns the zone ID, status, nameservers, and plan information. You need the zone ID for most other Cloudflare API operations.",
    inputSchema: z.object({
      identifier: z.string().describe("Zone ID or domain name"),
    }),
    execute: async (input, credentials) => {
      return apiClient("cloudflare", {
        method: "GET",
        path: `/zones`,
        query: { name: input.identifier },
      }, credentials);
    },
  },
];