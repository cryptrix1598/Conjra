import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const flyioTools: MCPTool[] = [
  {
    name: "create_fly_app",
    description:
      "Create a new Fly.io application. An app is a container for one or more services (machines) that run your code on Fly's edge network. Returns the app name and organization.",
    inputSchema: z.object({
      name: z.string().describe("App name (must be unique, lowercase, alphanumeric with hyphens)"),
      org: z.string().optional().describe("Fly.io organization slug. Defaults to your personal org."),
      network: z.string().optional().describe("Network to deploy on. Defaults to Fly's default network."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        app_name: input.name,
      };
      if (input.org) body.org_slug = input.org;
      if (input.network) body.network = input.network;

      return apiClient("flyio", {
        method: "POST",
        path: "/apps",
        body,
      }, credentials);
    },
  },
  {
    name: "deploy_to_fly",
    description:
      "Deploy a machine to a Fly.io app. Machines are lightweight VMs running Docker containers. Provide the Docker image and configuration for the deployment.",
    inputSchema: z.object({
      appName: z.string().describe("The Fly.io app name"),
      image: z.string().describe("Docker image to deploy (e.g. 'registry.fly.io/myapp:latest' or 'nginx:latest')"),
      region: z.string().optional().describe("Fly region code (e.g. 'sjc', 'lhr', 'nrt'). Defaults to nearest."),
      memory: z.number().optional().describe("Memory in MB. Defaults to 256."),
      cpuCount: z.number().optional().describe("Number of CPUs. Defaults to 1."),
      env: z.record(z.string(), z.string()).optional().describe("Environment variables for the machine"),
      services: z.array(z.object({
        port: z.number().describe("Internal port the service listens on"),
        protocol: z.enum(["tcp", "udp"]).optional().describe("Protocol. Defaults to tcp."),
        externalPort: z.number().optional().describe("External port. Defaults to same as internal port."),
      })).optional().describe("Network services to expose (ports)"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        config: {
          image: input.image,
        },
      };
      const config = body.config as Record<string, unknown>;
      if (input.region) config.region = input.region;
      if (input.memory) config.memory = input.memory;
      if (input.cpuCount) config.cpus = input.cpuCount;
      if (input.env) config.env = input.env;
      if (input.services) {
        config.services = input.services.map((s: { port: number; protocol?: string; externalPort?: number }) => ({
          internal_port: s.port,
          protocol: s.protocol ?? "tcp",
          ...(s.externalPort ? { external_port: s.externalPort } : {}),
        }));
      }

      return apiClient("flyio", {
        method: "POST",
        path: `/apps/${input.appName}/machines`,
        body,
      }, credentials);
    },
  },
  {
    name: "set_fly_secrets",
    description:
      "Set secrets (encrypted environment variables) on a Fly.io app. These are injected into machine environment at runtime and are never stored in plaintext.",
    inputSchema: z.object({
      appName: z.string().describe("The Fly.io app name"),
      secrets: z.record(z.string(), z.string()).describe("Key-value pairs of secrets to set (e.g. { DATABASE_URL: 'postgres://...', API_KEY: 'sk_...' })"),
    }),
    execute: async (input, credentials) => {
      return apiClient("flyio", {
        method: "POST",
        path: `/apps/${input.appName}/secrets`,
        body: { secrets: input.secrets },
      }, credentials);
    },
  },
  {
    name: "get_fly_status",
    description:
      "Get the status of a Fly.io app including its machines, their health, regions, and allocated resources. Useful for monitoring deployment health.",
    inputSchema: z.object({
      appName: z.string().describe("The Fly.io app name"),
    }),
    execute: async (input, credentials) => {
      return apiClient("flyio", {
        method: "GET",
        path: `/apps/${input.appName}`,
      }, credentials);
    },
  },
];