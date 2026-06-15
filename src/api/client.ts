import { APIError, AuthError, ProviderNotConnectedError } from "./errors.js";
import { getKeychainCredentials } from "../auth/keychain.js";

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  authType: "bearer" | "apikey" | "basic";
  headerName: string;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  supabase: {
    name: "supabase",
    baseUrl: "https://api.supabase.com/v1",
    authType: "bearer",
    headerName: "Authorization",
  },
  railway: {
    name: "railway",
    baseUrl: "https://backboard.railway.app/graphql/v1",
    authType: "bearer",
    headerName: "Authorization",
  },
  vercel: {
    name: "vercel",
    baseUrl: "https://api.vercel.com/v2",
    authType: "bearer",
    headerName: "Authorization",
  },
  stripe: {
    name: "stripe",
    baseUrl: "https://api.stripe.com/v1",
    authType: "bearer",
    headerName: "Authorization",
  },
  clerk: {
    name: "clerk",
    baseUrl: "https://api.clerk.com/v1",
    authType: "bearer",
    headerName: "Authorization",
  },
  resend: {
    name: "resend",
    baseUrl: "https://api.resend.com",
    authType: "bearer",
    headerName: "Authorization",
  },
  neon: {
    name: "neon",
    baseUrl: "https://console.neon.tech/api/v2",
    authType: "bearer",
    headerName: "Authorization",
  },
  upstash: {
    name: "upstash",
    baseUrl: "https://api.upstash.com/v2",
    authType: "apikey",
    headerName: "Authorization",
  },
  github: {
    name: "github",
    baseUrl: "https://api.github.com",
    authType: "bearer",
    headerName: "Authorization",
  },
  cloudflare: {
    name: "cloudflare",
    baseUrl: "https://api.cloudflare.com/client/v4",
    authType: "bearer",
    headerName: "Authorization",
  },
  firebase: {
    name: "firebase",
    baseUrl: "https://firebase.googleapis.com/v1beta1",
    authType: "bearer",
    headerName: "Authorization",
  },
  loops: {
    name: "loops",
    baseUrl: "https://app.loops.so/api/v1",
    authType: "bearer",
    headerName: "Authorization",
  },
  twilio: {
    name: "twilio",
    baseUrl: "https://api.twilio.com/2010-04-01",
    authType: "basic",
    headerName: "Authorization",
  },
  openai: {
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    authType: "bearer",
    headerName: "Authorization",
  },
  anthropic: {
    name: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    authType: "apikey",
    headerName: "x-api-key",
  },
  replicate: {
    name: "replicate",
    baseUrl: "https://api.replicate.com/v1",
    authType: "bearer",
    headerName: "Authorization",
  },
  flyio: {
    name: "flyio",
    baseUrl: "https://api.fly.io/v1",
    authType: "bearer",
    headerName: "Authorization",
  },
  awsamplify: {
    name: "awsamplify",
    baseUrl: "https://amplify.us-east-1.amazonaws.com",
    authType: "bearer",
    headerName: "Authorization",
  },
};

function getProviderConfig(provider: string): ProviderConfig {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new APIError({
      message: `Unknown provider: ${provider}`,
      status: 0,
      provider,
      code: "UNKNOWN_PROVIDER",
    });
  }
  return config;
}

function buildAuthHeader(
  config: ProviderConfig,
  credentials: Record<string, string>
): string {
  switch (config.authType) {
    case "bearer":
      return `Bearer ${credentials.accessToken ?? credentials.apiKey}`;
    case "apikey":
      return credentials.apiKey;
    case "basic": {
      const encoded = Buffer.from(
        `${credentials.accountSid ?? credentials.username}:${credentials.authToken ?? credentials.password}`
      ).toString("base64");
      return `Basic ${encoded}`;
    }
  }
}

function buildProviderHeaders(provider: string, baseHeaders: Record<string, string>): void {
  if (provider === "github") {
    baseHeaders["Accept"] = "application/vnd.github+json";
  }
  if (provider === "anthropic") {
    baseHeaders["anthropic-version"] = "2023-06-01";
  }
  if (provider === "stripe") {
    // Stripe uses form-encoded for some endpoints but JSON for others
    // Keep JSON as default — callers can override Content-Type per-endpoint
  }
}

function objectToFormUrlencoded(obj: any, prefix = ""): string {
  const parts: string[] = [];
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const k = `${prefix}[${i}]`;
      const v = obj[i];
      if (v !== null && typeof v === "object") {
        parts.push(objectToFormUrlencoded(v, k));
      } else if (v !== undefined) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    }
  } else if (obj !== null && typeof obj === "object") {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const k = prefix ? `${prefix}[${key}]` : key;
        const v = obj[key];
        if (v !== null && typeof v === "object") {
          parts.push(objectToFormUrlencoded(v, k));
        } else if (v !== undefined) {
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
      }
    }
  } else if (obj !== undefined) {
    parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`);
  }
  return parts.join("&");
}

async function executeRequest<T = unknown>(
  provider: string,
  opts: RequestOptions,
  credentials: Record<string, string>
): Promise<T> {
  const config = getProviderConfig(provider);

  const url = new URL(`${config.baseUrl}${opts.path}`);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "conjra/1.0.0",
    ...opts.headers,
  };

  if (provider === "stripe" && (!opts.headers || !opts.headers["Content-Type"])) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  headers[config.headerName] = buildAuthHeader(config, credentials);
  buildProviderHeaders(provider, headers);

  let body: string | undefined;
  if (opts.body && opts.method !== "GET") {
    if (headers["Content-Type"] === "application/x-www-form-urlencoded") {
      body = objectToFormUrlencoded(opts.body);
    } else {
      body = JSON.stringify(opts.body);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: opts.method,
      headers,
      body,
    });

    if (!response.ok) {
      let errorDetails: unknown;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text().catch(() => undefined);
      }

      if (response.status === 401 || response.status === 403) {
        throw new AuthError({
          message: `Authentication failed for ${provider}. Your credentials may be expired or invalid.`,
          provider,
        });
      }

      throw new APIError({
        message: `Request to ${provider} failed: ${response.status} ${response.statusText}`,
        status: response.status,
        provider,
        code: `HTTP_${response.status}`,
        details: errorDetails,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof APIError || err instanceof AuthError || err instanceof ProviderNotConnectedError) {
      throw err;
    }

    throw new APIError({
      message: `Network error contacting ${provider}: ${err instanceof Error ? err.message : String(err)}`,
      status: 0,
      provider,
      code: "NETWORK_ERROR",
    });
  }
}

/**
 * Make an API request to a provider using credentials that are already available.
 * This is the primary function used by MCP tool execute() handlers.
 */
export function apiClient<T = unknown>(
  provider: string,
  opts: RequestOptions,
  credentials: Record<string, string>
): Promise<T> {
  return executeRequest<T>(provider, opts, credentials);
}

/**
 * Make an API request to a provider, fetching credentials from the keychain automatically.
 * Used by CLI commands and other non-tool code paths.
 */
export async function apiRequest<T = unknown>(
  provider: string,
  opts: RequestOptions
): Promise<T> {
  const credentials = await getKeychainCredentials(provider);
  if (!credentials) {
    throw new ProviderNotConnectedError(provider);
  }
  return executeRequest<T>(provider, opts, credentials);
}

export function getProviderBaseUrl(provider: string): string {
  return getProviderConfig(provider).baseUrl;
}