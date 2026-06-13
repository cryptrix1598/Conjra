export type AuthMethod = "oauth" | "apikey" | "basic";

export interface ProviderAuthConfig {
  name: string;
  displayName: string;
  authMethod: AuthMethod;
  credentialKeys: string[];
  oauthConfig?: {
    authorizeUrl: string;
    tokenUrl: string;
    clientId: string;
    scopes: string[];
  };
  promptMessage: string;
}

export const PROVIDER_AUTH_CONFIGS: Record<string, ProviderAuthConfig> = {
  supabase: {
    name: "supabase",
    displayName: "Supabase",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Supabase personal access token (from https://supabase.com/dashboard/account/tokens)",
  },
  railway: {
    name: "railway",
    displayName: "Railway",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Railway API token (from https://railway.app/account/tokens)",
  },
  vercel: {
    name: "vercel",
    displayName: "Vercel",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Vercel API token (from https://vercel.com/account/tokens)",
  },
  stripe: {
    name: "stripe",
    displayName: "Stripe",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Stripe secret key (sk_live_... or sk_test_...)",
  },
  clerk: {
    name: "clerk",
    displayName: "Clerk",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Clerk API key (from https://dashboard.clerk.com)",
  },
  resend: {
    name: "resend",
    displayName: "Resend",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Resend API key (from https://resend.com/api-keys)",
  },
  neon: {
    name: "neon",
    displayName: "Neon",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Neon API key (from https://console.neon.tech/settings/api-keys)",
  },
  upstash: {
    name: "upstash",
    displayName: "Upstash",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Upstash API key (from https://console.upstash.com/account/api-keys)",
  },
  github: {
    name: "github",
    displayName: "GitHub",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your GitHub personal access token (from https://github.com/settings/tokens)",
  },
  cloudflare: {
    name: "cloudflare",
    displayName: "Cloudflare",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Cloudflare API token (from https://dash.cloudflare.com/profile/api-tokens)",
  },
  firebase: {
    name: "firebase",
    displayName: "Firebase",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Firebase/GCP access token",
  },
  loops: {
    name: "loops",
    displayName: "Loops",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Loops API key (from https://app.loops.so/settings/api)",
  },
  twilio: {
    name: "twilio",
    displayName: "Twilio",
    authMethod: "basic",
    credentialKeys: ["accountSid", "authToken"],
    promptMessage: "Enter your Twilio Account SID and Auth Token (from https://console.twilio.com)",
  },
  openai: {
    name: "openai",
    displayName: "OpenAI",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your OpenAI API key (from https://platform.openai.com/api-keys)",
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Anthropic API key (from https://console.anthropic.com/settings/keys)",
  },
  replicate: {
    name: "replicate",
    displayName: "Replicate",
    authMethod: "apikey",
    credentialKeys: ["apiKey"],
    promptMessage: "Enter your Replicate API token (from https://replicate.com/account/api-tokens)",
  },
  flyio: {
    name: "flyio",
    displayName: "Fly.io",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your Fly.io API token (from https://fly.io/user/personal_access_tokens)",
  },
  awsamplify: {
    name: "awsamplify",
    displayName: "AWS Amplify",
    authMethod: "apikey",
    credentialKeys: ["accessToken"],
    promptMessage: "Enter your AWS access token",
  },
};

export function getProviderAuthConfig(provider: string): ProviderAuthConfig | null {
  return PROVIDER_AUTH_CONFIGS[provider] ?? null;
}

export function getAllProviderNames(): string[] {
  return Object.keys(PROVIDER_AUTH_CONFIGS).sort();
}