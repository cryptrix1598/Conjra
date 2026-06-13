import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const stripeTools: MCPTool[] = [
  {
    name: "create_stripe_product",
    description:
      "Create a new product in Stripe. A product represents the item or service being sold. After creating a product, you typically create a price for it using create_stripe_price.",
    inputSchema: z.object({
      name: z.string().describe("The product's name, meant to be displayable to the customer"),
      description: z.string().optional().describe("The product's description, meant to be displayable to the customer"),
      metadata: z.record(z.string(), z.string()).optional().describe("Set of key-value pairs for custom metadata"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = { name: input.name };
      if (input.description) body.description = input.description;
      if (input.metadata) body.metadata = input.metadata;
      return apiClient("stripe", {
        method: "POST",
        path: "/products",
        body,
      }, credentials);
    },
  },
  {
    name: "create_stripe_price",
    description:
      "Create a price for a Stripe product. A price defines how much and how frequently to charge for a product. Supports one-time and recurring (subscription) prices.",
    inputSchema: z.object({
      productId: z.string().describe("The ID of the product this price belongs to (prod_...)"),
      unitAmount: z.number().describe("Price in cents (e.g. 2000 = $20.00)"),
      currency: z.string().describe("Three-letter ISO currency code (e.g. usd, eur, gbp)"),
      recurring: z.object({
        interval: z.enum(["day", "week", "month", "year"]).describe("Billing frequency"),
        intervalCount: z.number().optional().describe("Number of intervals between billings (e.g. 2 for every 2 months)"),
      }).optional().describe("Set this for subscription prices. Omit for one-time prices."),
      nickname: z.string().optional().describe("A brief description of the price, visible in the dashboard"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        product: input.productId,
        unit_amount: input.unitAmount,
        currency: input.currency.toLowerCase(),
      };
      if (input.recurring) {
        const recurringData: Record<string, unknown> = { interval: input.recurring.interval };
        if (input.recurring.intervalCount !== undefined) {
          recurringData.interval_count = input.recurring.intervalCount;
        }
        body.recurring = recurringData;
      }
      if (input.nickname) body.nickname = input.nickname;
      return apiClient("stripe", {
        method: "POST",
        path: "/prices",
        body,
      }, credentials);
    },
  },
  {
    name: "create_stripe_webhook",
    description:
      "Create a webhook endpoint in Stripe. Webhooks notify your server when events occur in Stripe (e.g. payment succeeded, subscription canceled). Returns the endpoint URL and signing secret.",
    inputSchema: z.object({
      url: z.string().describe("The URL of the webhook endpoint (must be HTTPS)"),
      events: z.array(z.string()).describe("List of event types to listen for (e.g. ['payment_intent.succeeded', 'customer.subscription.deleted'])"),
      description: z.string().optional().describe("Optional description for this webhook endpoint"),
      apiVersion: z.string().optional().describe("Stripe API version for webhook calls (e.g. '2024-06-20')"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        url: input.url,
        enabled_events: input.events,
      };
      if (input.description) body.description = input.description;
      if (input.apiVersion) body.api_version = input.apiVersion;
      return apiClient("stripe", {
        method: "POST",
        path: "/webhook_endpoints",
        body,
      }, credentials);
    },
  },
  {
    name: "get_stripe_account_info",
    description:
      "Retrieve information about the connected Stripe account. Returns account ID, business type, country, default currency, and other account details. Useful for verifying the connection works.",
    inputSchema: z.object({}),
    execute: async (_input, credentials) => {
      return apiClient("stripe", {
        method: "GET",
        path: "/account",
      }, credentials);
    },
  },
];