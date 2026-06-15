import { z, ZodType } from "zod";
import { supabaseTools } from "./tools/supabase.js";
import { stripeTools } from "./tools/stripe.js";
import { railwayTools } from "./tools/railway.js";
import { vercelTools } from "./tools/vercel.js";
import { clerkTools } from "./tools/clerk.js";
import { resendTools } from "./tools/resend.js";
import { neonTools } from "./tools/neon.js";
import { upstashTools } from "./tools/upstash.js";
import { githubTools } from "./tools/github.js";
import { cloudflareTools } from "./tools/cloudflare.js";
import { firebaseTools } from "./tools/firebase.js";
import { loopsTools } from "./tools/loops.js";
import { twilioTools } from "./tools/twilio.js";
import { openaiTools } from "./tools/openai.js";
import { anthropicTools } from "./tools/anthropic.js";
import { replicateTools } from "./tools/replicate.js";
import { flyioTools } from "./tools/flyio.js";
import { awsAmplifyTools } from "./tools/awsamplify.js";

export interface MCPTool<T extends ZodType = ZodType> {
  name: string;
  description: string;
  inputSchema: T;
  provider: string;
  execute: (input: z.infer<T>, credentials: Record<string, string>) => Promise<unknown>;
}

export interface MCPToolManifest {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export function manifestFromTool(tool: MCPTool): MCPToolManifest {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema),
  };
}

function zodToJsonSchema(schema: ZodType): Record<string, unknown> {
  const shape: Record<string, unknown> = {};

  if (schema instanceof z.ZodObject) {
    shape.type = "object";
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(schema.shape)) {
      const fieldSchema = value as ZodType;
      let isOptional = false;

      if (fieldSchema instanceof z.ZodOptional) {
        isOptional = true;
      }

      if (!isOptional) {
        required.push(key);
      }

      properties[key] = zodTypeToJsonSchema(
        fieldSchema instanceof z.ZodOptional ? fieldSchema.unwrap() : fieldSchema
      );
    }

    shape.properties = properties;
    if (required.length > 0) {
      shape.required = required;
    }
  }

  return shape;
}

function zodTypeToJsonSchema(schema: ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodString) {
    const result: Record<string, unknown> = { type: "string" };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }
  if (schema instanceof z.ZodNumber) {
    const result: Record<string, unknown> = { type: "number" };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }
  if (schema instanceof z.ZodBoolean) {
    const result: Record<string, unknown> = { type: "boolean" };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }
  if (schema instanceof z.ZodEnum) {
    const result: Record<string, unknown> = {
      type: "string",
      enum: schema.options as string[],
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }
  if (schema instanceof z.ZodArray) {
    const result: Record<string, unknown> = {
      type: "array",
      items: zodTypeToJsonSchema(schema.element as ZodType),
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }
  if (schema instanceof z.ZodRecord) {
    const result: Record<string, unknown> = {
      type: "object",
      additionalProperties: { type: "string" },
    };
    return result;
  }
  if (schema instanceof z.ZodDefault) {
    return zodTypeToJsonSchema(schema.removeDefault() as ZodType);
  }
  if (schema instanceof z.ZodOptional) {
    return zodTypeToJsonSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodObject) {
    return zodToJsonSchema(schema);
  }

  return { type: "string" };
}

/**
 * Load all provider tools by statically importing every tool module.
 * This is the single source of truth for which providers are available.
 */
export function loadAllTools(): MCPTool[] {
  return [
    ...supabaseTools,
    ...stripeTools,
    ...railwayTools,
    ...vercelTools,
    ...clerkTools,
    ...resendTools,
    ...neonTools,
    ...upstashTools,
    ...githubTools,
    ...cloudflareTools,
    ...firebaseTools,
    ...loopsTools,
    ...twilioTools,
    ...openaiTools,
    ...anthropicTools,
    ...replicateTools,
    ...flyioTools,
    ...awsAmplifyTools,
  ];
}