import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const replicateTools: MCPTool[] = [
  {
    name: "run_replicate_model",
    description:
      "Run a model on Replicate. Provide the model identifier (e.g. 'stability-ai/sdxl') and input parameters. Returns a prediction ID you can poll for results using get_replicate_prediction.",
    inputSchema: z.object({
      model: z.string().describe("Model identifier in 'owner/name' format (e.g. 'stability-ai/sdxl', 'meta/llama-3-70b')"),
      version: z.string().optional().describe("Specific model version hash. If omitted, uses the latest version."),
      input: z.record(z.unknown()).describe("Model-specific input parameters (e.g. { prompt: 'a cat in space', width: 1024 })"),
      webhook: z.string().optional().describe("URL to receive a POST when the prediction completes"),
      webhookEvents: z.array(z.enum(["start", "output", "logs", "completed"])).optional().describe("Which events trigger the webhook"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        model: input.model,
        input: input.input,
      };
      if (input.version) body.version = input.version;
      if (input.webhook) {
        body.webhook = input.webhook;
        if (input.webhookEvents) body.webhook_events_completed = input.webhookEvents;
      }

      return apiClient("replicate", {
        method: "POST",
        path: "/predictions",
        body,
      }, credentials);
    },
  },
  {
    name: "get_replicate_prediction",
    description:
      "Get the status and output of a Replicate prediction. Poll this endpoint to check if a model run has completed. Returns the prediction status (starting, processing, succeeded, failed, canceled) and output data.",
    inputSchema: z.object({
      predictionId: z.string().describe("The prediction ID returned by run_replicate_model"),
    }),
    execute: async (input, credentials) => {
      return apiClient("replicate", {
        method: "GET",
        path: `/predictions/${input.predictionId}`,
      }, credentials);
    },
  },
  {
    name: "list_replicate_models",
    description:
      "List or search for models on Replicate. Returns model identifiers, descriptions, and URLs. Useful for discovering which AI models are available to run.",
    inputSchema: z.object({
      query: z.string().optional().describe("Search query to filter models (e.g. 'image generation', 'text to speech')"),
      limit: z.number().optional().describe("Maximum number of results. Defaults to 20."),
    }),
    execute: async (input, credentials) => {
      const query: Record<string, string> = {};
      if (input.query) query.search = input.query;
      query.limit = String(input.limit ?? 20);

      return apiClient("replicate", {
        method: "GET",
        path: "/models",
        query,
      }, credentials);
    },
  },
];