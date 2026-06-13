import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";

const REDIRECT_PORT = 4213;
const REDIRECT_HOST = "localhost";
const REDIRECT_PATH = "/callback";

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
}

export interface OAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

function buildRedirectUri(): string {
  return `http://${REDIRECT_HOST}:${REDIRECT_PORT}${REDIRECT_PATH}`;
}

export function buildAuthorizeUrl(config: OAuthConfig, state: string): string {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", buildRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function waitForCallback(
  config: OAuthConfig,
  state: string
): Promise<OAuthResult> {
  const server: Server = await new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(REDIRECT_PORT, REDIRECT_HOST, () => resolve(srv));
    srv.on("error", reject);
  });

  try {
    const { code } = await new Promise<{ code: string }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("OAuth flow timed out after 120 seconds"));
      }, 120_000);

      server.on("request", (req, res) => {
        const url = new URL(req.url ?? "/", `http://${REDIRECT_HOST}:${REDIRECT_PORT}`);
        if (url.pathname !== REDIRECT_PATH) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }

        const returnedState = url.searchParams.get("state");
        const returnedCode = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h2>OAuth Error</h2><p>${error}</p><p>You can close this tab.</p></body></html>`);
          clearTimeout(timeout);
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (returnedState !== state || !returnedCode) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h2>Invalid OAuth response</h2><p>You can close this tab.</p></body></html>");
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h2>✅ Authorization successful!</h2><p>You can close this tab and return to your terminal.</p></body></html>");
        clearTimeout(timeout);
        resolve({ code: returnedCode });
      });
    });

    const tokenResponse = await exchangeCodeForToken(config, code);
    return tokenResponse;
  } finally {
    server.close();
  }
}

async function exchangeCodeForToken(
  config: OAuthConfig,
  code: string
): Promise<OAuthResult> {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: buildRedirectUri(),
      client_id: config.clientId,
      ...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json() as Record<string, unknown>;

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: data.expires_in as number | undefined,
  };
}

export function generateState(): string {
  return randomUUID();
}