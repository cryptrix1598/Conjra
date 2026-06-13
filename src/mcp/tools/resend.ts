import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const resendTools: MCPTool[] = [
  {
    name: "add_resend_domain",
    description:
      "Add and verify a custom sending domain in Resend. After adding, you must configure DNS records (SPF, DKIM, DMARC) at your domain registrar. Returns the DNS records you need to add.",
    inputSchema: z.object({
      domain: z.string().describe("The domain name to add for sending email (e.g. 'example.com')"),
    }),
    execute: async (input, credentials) => {
      return apiClient("resend", {
        method: "POST",
        path: "/domains",
        body: { name: input.domain },
      }, credentials);
    },
  },
  {
    name: "create_resend_api_key",
    description:
      "Create a new Resend API key. API keys are used to send emails programmatically. You can scope keys to specific sending domains for security.",
    inputSchema: z.object({
      name: z.string().describe("A descriptive name for this API key"),
      domainId: z.string().optional().describe("Restrict this key to a specific domain ID. If omitted, the key has full access."),
      permission: z.enum(["full_access", "sending_access"]).optional().describe("Permission level. Defaults to 'sending_access'."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = { name: input.name };
      if (input.domainId) body.domain_id = input.domainId;
      if (input.permission) body.permission = input.permission;

      return apiClient("resend", {
        method: "POST",
        path: "/api-keys",
        body,
      }, credentials);
    },
  },
  {
    name: "send_test_email",
    description:
      "Send a test email through Resend. Use this to verify your Resend setup is working correctly. Supports HTML and text content.",
    inputSchema: z.object({
      to: z.string().describe("Recipient email address"),
      from: z.string().describe("Sender email in 'Name <email@domain.com>' format"),
      subject: z.string().describe("Email subject line"),
      html: z.string().optional().describe("HTML body content"),
      text: z.string().optional().describe("Plain text body content. Used if HTML is not provided."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {
        to: input.to,
        from: input.from,
        subject: input.subject,
      };
      if (input.html) body.html = input.html;
      if (input.text) body.text = input.text;

      return apiClient("resend", {
        method: "POST",
        path: "/emails",
        body,
      }, credentials);
    },
  },
];