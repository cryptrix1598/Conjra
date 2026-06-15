import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const upstashTools: MCPTool[] = [
  {
    name: "create_upstash_redis",
    description:
      "Create a new Upstash Redis instance. Upstash provides serverless Redis with per-request pricing and TLS. Returns the REST URL and token for connecting.",
    inputSchema: z.object({
      name: z.string().describe("Name for the Redis instance"),
      region: z.string().optional().describe("Region for the instance (e.g. us-east-1, eu-west-1). Defaults to us-east-1."),
      tls: z.boolean().optional().describe("Enable TLS. Defaults to true."),
      ephemeral: z.boolean().optional().describe("Create an ephemeral instance (data lost on eviction). Defaults to false."),
    }),
    provider: "upstash",
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = { name: input.name };
      if (input.region) body.region = input.region;
      if (input.tls !== undefined) body.tls = input.tls;
      if (input.ephemeral !== undefined) body.ephemeral = input.ephemeral;

      return apiClient("upstash", {
        method: "POST",
        path: "/redis",
        body,
      }, credentials);
    },
  },
  {
    name: "create_upstash_kafka",
    description:
      "Create a new Upstash Kafka cluster. Upstash Kafka provides serverless Kafka with per-message pricing. Returns cluster credentials for connecting producers and consumers.",
    inputSchema: z.object({
      name: z.string().describe("Name for the Kafka cluster"),
      region: z.string().optional().describe("Region for the cluster (e.g. us-east-1, eu-west-1). Defaults to us-east-1."),
      partitions: z.number().optional().describe("Number of default partitions. Defaults to 1."),
    }),
    provider: "upstash",
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = { name: input.name };
      if (input.region) body.region = input.region;
      if (input.partitions !== undefined) body.partitions = input.partitions;

      return apiClient("upstash", {
        method: "POST",
        path: "/kafka",
        body,
      }, credentials);
    },
  },
  {
    name: "get_upstash_credentials",
    description:
      "Retrieve the connection credentials for an Upstash resource (Redis or Kafka). Returns the endpoint URL, password/token, and other connection details needed by your application.",
    inputSchema: z.object({
      resourceId: z.string().describe("The Upstash resource ID"),
      type: z.enum(["redis", "kafka", "qstash"]).describe("The type of Upstash resource"),
    }),
    provider: "upstash",
    execute: async (input, credentials) => {
      const basePath = input.type === "redis" ? "/redis" : input.type === "kafka" ? "/kafka" : "/qstash";
      return apiClient("upstash", {
        method: "GET",
        path: `${basePath}/${input.resourceId}`,
      }, credentials);
    },
  },
];