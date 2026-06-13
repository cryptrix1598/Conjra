import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

export const twilioTools: MCPTool[] = [
  {
    name: "send_twilio_sms",
    description:
      "Send an SMS message via Twilio. Requires a Twilio phone number as the sender. Returns the message SID and status. Message length is limited to 160 characters for standard SMS.",
    inputSchema: z.object({
      to: z.string().describe("Recipient phone number in E.164 format (e.g. '+15551234567')"),
      from: z.string().describe("Your Twilio phone number in E.164 format (e.g. '+15559876543')"),
      body: z.string().describe("The text message content (max 160 chars for standard SMS, 1600 for long SMS)"),
      statusCallback: z.string().optional().describe("URL where Twilio posts message status updates"),
    }),
    execute: async (input, credentials) => {
      const accountSid = credentials.accountSid;
      const body = new URLSearchParams({
        To: input.to,
        From: input.from,
        Body: input.body,
      });
      if (input.statusCallback) body.set("StatusCallback", input.statusCallback);

      return apiClient("twilio", {
        method: "POST",
        path: `/Accounts/${accountSid}/Messages.json`,
        body: Object.fromEntries(body.entries()),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }, credentials);
    },
  },
  {
    name: "get_twilio_phone_numbers",
    description:
      "List phone numbers available in your Twilio account. These are numbers you have purchased and can use as senders for SMS or voice calls.",
    inputSchema: z.object({
      accountSid: z.string().optional().describe("Twilio Account SID. Defaults to the one stored in keychain."),
    }),
    execute: async (input, credentials) => {
      const sid = input.accountSid ?? credentials.accountSid;
      return apiClient("twilio", {
        method: "GET",
        path: `/Accounts/${sid}/IncomingPhoneNumbers.json`,
      }, credentials);
    },
  },
  {
    name: "create_twilio_webhook",
    description:
      "Configure a webhook URL for a Twilio phone number. When an SMS or call is received, Twilio sends the details to this URL. Used to build SMS bots, auto-responders, and IVR systems.",
    inputSchema: z.object({
      phoneSid: z.string().describe("The Twilio phone number SID (PN...)"),
      smsUrl: z.string().optional().describe("URL for incoming SMS webhook"),
      voiceUrl: z.string().optional().describe("URL for incoming voice call webhook"),
      statusCallback: z.string().optional().describe("URL for status callback webhook"),
      method: z.enum(["GET", "POST"]).optional().describe("HTTP method for webhook calls. Defaults to POST."),
    }),
    execute: async (input, credentials) => {
      const body: Record<string, unknown> = {};
      if (input.smsUrl) body.SmsUrl = input.smsUrl;
      if (input.voiceUrl) body.VoiceUrl = input.voiceUrl;
      if (input.statusCallback) body.StatusCallback = input.statusCallback;
      if (input.method) body.SmsMethod = input.method;

      return apiClient("twilio", {
        method: "POST",
        path: `/Accounts/${credentials.accountSid}/IncomingPhoneNumbers/${input.phoneSid}.json`,
        body: Object.fromEntries(
          Object.entries(body).map(([k, v]) => [k, v])
        ),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }, credentials);
    },
  },
];