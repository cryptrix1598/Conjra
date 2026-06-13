import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const loopsTools: MCPTool[] = [
  {
    name: "create_loops_contact",
    description:
      "Create or update a contact in Loops. Loops is an email marketing platform. Contacts can have custom properties and belong to mailing lists. If a contact with the same email exists, it is updated.",
    inputSchema: z.object({
      email: z.string().describe("Contact email address"),
      firstName: z.string().optional().describe("Contact's first name"),
      lastName: z.string().optional().describe("Contact's last name"),
      subscribed: z.boolean().optional().describe("Whether the contact is opted in to emails. Defaults to true."),
      mailingLists: z.record(z.string(), z.boolean()).optional().describe("Mailing list IDs mapped to boolean (true = subscribed, false = unsubscribed)"),
      customProperties: z.record(z.string(), z.string()).optional().describe("Custom properties for the contact (e.g. { plan: 'pro', signupDate: '2024-01-01' })"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = { email: input.email };
      if (input.firstName) body.firstName = input.firstName;
      if (input.lastName) body.lastName = input.lastName;
      if (input.subscribed !== undefined) body.subscribed = input.subscribed;
      if (input.mailingLists) body.mailingLists = input.mailingLists;
      if (input.customProperties) {
        for (const [key, value] of Object.entries(input.customProperties)) {
          body[key] = value;
        }
      }

      return apiClient("loops", {
        method: "POST",
        path: "/contacts/create",
        body,
      }, credentials);
    },
  },
  {
    name: "create_loops_campaign",
    description:
      "Send a transactional email or trigger a Loops campaign event. Use this to send targeted emails to contacts based on events in your application (e.g. welcome emails, password resets).",
    inputSchema: z.object({
      transactionalId: z.string().describe("The transactional email ID from your Loops dashboard"),
      email: z.string().describe("Recipient email address"),
      dataVariables: z.record(z.string(), z.string()).optional().describe("Template variables to populate in the email (e.g. { companyName: 'Acme', userName: 'Alice' })"),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        transactionalId: input.transactionalId,
        email: input.email,
      };
      if (input.dataVariables) body.dataVariables = input.dataVariables;

      return apiClient("loops", {
        method: "POST",
        path: "/transactional",
        body,
      }, credentials);
    },
  },
  {
    name: "get_loops_api_key",
    description:
      "Verify the Loops API key is valid by checking the API status. Returns the API key status and account info. Useful for testing the connection after adding Loops as a provider.",
    inputSchema: z.object({}),
    execute: async (_input, credentials) => {
      return apiClient("loops", {
        method: "GET",
        path: "/api-key",
      }, credentials);
    },
  },
];