<div align="center">

# conjra

**Provision cloud infrastructure from your editor. Never touch a dashboard again.**

[![npm version](https://img.shields.io/npm/v/conjra.svg)](https://www.npmjs.com/package/conjra)
[![license](https://img.shields.io/npm/l/conjra.svg)](https://github.com/conjra/conjra/blob/main/LICENSE)

</div>

---

## What is Conjra?

Conjra gives any of your **20 supported AI editors** native MCP tools to provision real cloud infrastructure — Supabase, Railway, Vercel, Stripe, Clerk, and 13 more providers — without ever leaving your editor.

Install once, connect your providers, then just tell your AI:

> "Use conjra to add Stripe to this project"
> "Use conjra to create a Supabase project and run migrations"
> "Use conjra to deploy this to Railway"

Conjra handles credential storage via an encrypted local vault (one-time setup per provider). All provisioning calls go directly to provider REST APIs — no third-party middleware, no Composio, no Zapier.

---

## Quick Start

### 1. Install

```bash
npm install -g conjra
```

### 2. Initialize for your AI editor

```bash
conjra init --ai all          # Configure all 20 supported editors
conjra init --ai claude       # Or pick a specific one
```

Supports 20 editors: Claude Code, Cursor, Windsurf, Antigravity CLI, Gemini CLI, Codex CLI, GitHub Copilot, Cline, Aider, Continue.dev, OpenCode, Amazon Q Developer, Kiro, Warp 2.0, Goose, Roo Code, Qoder, Trae, Droid, KiloCode.

This registers the Conjra MCP server so your editor can use Conjra tools. Run `conjra init` with no flag to auto-detect installed editors.

### 3. Connect a provider

```bash
conjra add supabase
conjra add stripe
conjra add railway
```

Enter your API key when prompted. Credentials are stored in an encrypted local vault — never sent anywhere except directly to the provider's API.

### 4. Use it

That's it. Now ask Claude to use Conjra tools:

> "Use conjra to create a Supabase project called my-app"
> "Use conjra to create a Stripe product called Pro Plan"
> "Use conjra to deploy to Railway"

---

## Supported Providers

| Provider | Command | Tools |
|----------|---------|-------|
| **Supabase** | `conjra add supabase` | create_project, run_migration, get_url_and_keys, create_bucket |
| **Railway** | `conjra add railway` | create_project, deploy, set_env_vars, get_deployment_status |
| **Vercel** | `conjra add vercel` | deploy, add_domain, set_env, get_deployment |
| **Stripe** | `conjra add stripe` | create_product, create_price, create_webhook, get_account_info |
| **Clerk** | `conjra add clerk` | create_app, get_keys, configure_jwt |
| **Resend** | `conjra add resend` | add_domain, create_api_key, send_test_email |
| **Neon** | `conjra add neon` | create_project, create_branch, get_connection_string |
| **Upstash** | `conjra add upstash` | create_redis, create_kafka, get_credentials |
| **GitHub** | `conjra add github` | create_repo, add_secret, create_webhook |
| **Cloudflare** | `conjra add cloudflare` | add_domain, create_worker, get_zone |
| **Firebase** | `conjra add firebase` | create_project, get_config, enable_auth |
| **Loops** | `conjra add loops` | create_contact, create_campaign, get_api_key |
| **Twilio** | `conjra add twilio` | send_sms, get_phone_numbers, create_webhook |
| **OpenAI** | `conjra add openai` | create_api_key, get_usage, list_models |
| **Anthropic** | `conjra add anthropic` | create_api_key, get_usage |
| **Replicate** | `conjra add replicate` | run_model, get_prediction, list_models |
| **Fly.io** | `conjra add flyio` | create_app, deploy, set_secrets, get_status |
| **AWS Amplify** | `conjra add awsamplify` | create_app, deploy_branch, get_url |

---

## All MCP Tools (58 total)

| Tool Name | Description |
|-----------|-------------|
| `create_supabase_project` | Create a new Supabase project |
| `run_supabase_migration` | Execute a SQL migration on a Supabase project |
| `get_supabase_url_and_keys` | Retrieve API URL, anon key, and service role key |
| `create_supabase_bucket` | Create a storage bucket |
| `create_railway_project` | Create a new Railway project |
| `deploy_to_railway` | Trigger a deployment on a Railway service |
| `set_railway_env_vars` | Set environment variables on a Railway service |
| `get_railway_deployment_status` | Check deployment status |
| `deploy_to_vercel` | Deploy a project to Vercel |
| `add_vercel_domain` | Add a custom domain |
| `set_vercel_env` | Set an environment variable |
| `get_vercel_deployment` | Get deployment details |
| `create_stripe_product` | Create a product in Stripe |
| `create_stripe_price` | Create a price for a product |
| `create_stripe_webhook` | Create a webhook endpoint |
| `get_stripe_account_info` | Retrieve account information |
| `create_clerk_app` | Create a Clerk application |
| `get_clerk_keys` | Retrieve API keys |
| `configure_clerk_jwt` | Configure JWT template |
| `add_resend_domain` | Add a sending domain |
| `create_resend_api_key` | Create an API key |
| `send_test_email` | Send a test email |
| `create_neon_project` | Create a Neon PostgreSQL project |
| `create_neon_branch` | Create a database branch |
| `get_neon_connection_string` | Get the connection string |
| `create_upstash_redis` | Create a Redis instance |
| `create_upstash_kafka` | Create a Kafka cluster |
| `get_upstash_credentials` | Retrieve connection credentials |
| `create_github_repo` | Create a GitHub repository |
| `add_github_secret` | Add a repository secret |
| `create_github_webhook` | Create a repository webhook |
| `add_cloudflare_domain` | Add a domain to Cloudflare |
| `create_cloudflare_worker` | Create a Worker script |
| `get_cloudflare_zone` | Get zone details |
| `create_firebase_project` | Create a Firebase project |
| `get_firebase_config` | Get client configuration |
| `enable_firebase_auth` | Enable an auth provider |
| `create_loops_contact` | Create or update a contact |
| `create_loops_campaign` | Send a transactional email |
| `get_loops_api_key` | Verify API key status |
| `send_twilio_sms` | Send an SMS message |
| `get_twilio_phone_numbers` | List phone numbers |
| `create_twilio_webhook` | Configure a phone number webhook |
| `create_openai_api_key` | Create an API key |
| `get_openai_usage` | Retrieve usage and billing info |
| `list_openai_models` | List available models |
| `create_anthropic_api_key` | Create an API key |
| `get_anthropic_usage` | Retrieve usage and billing info |
| `run_replicate_model` | Run a model on Replicate |
| `get_replicate_prediction` | Get prediction status and output |
| `list_replicate_models` | Search for available models |
| `create_fly_app` | Create a Fly.io application |
| `deploy_to_fly` | Deploy a machine to Fly.io |
| `set_fly_secrets` | Set encrypted secrets |
| `get_fly_status` | Get app status |
| `create_amplify_app` | Create an AWS Amplify app |
| `deploy_amplify_branch` | Deploy a branch |
| `get_amplify_url` | Get deployment URL |

---

## CLI Commands

```bash
conjra init [--ai <editor>|all]   # Register MCP server (omit for auto-detect)
conjra add <provider>              # Connect a cloud provider
conjra remove <provider>           # Disconnect a provider
conjra status                      # Show status across all 20 editors
conjra --version                   # Show version
conjra --help                      # Show help
```

---

## How It Works

1. **`conjra init`** registers the MCP server in your AI editor's config file
2. **`conjra add`** stores your API keys in an AES-256-GCM encrypted vault (`~/.conjra/vault/`)
3. When your AI calls a Conjra tool, the MCP server:
   - Reads credentials from the encrypted vault
   - Makes the API call directly to the provider
   - Returns the result to Claude

No middleware. No third-party service. Your credentials never leave your machine.

---

## Security

- Credentials are encrypted with AES-256-GCM using a key derived from your machine's unique fingerprint (via `scrypt`)
- The encrypted vault is stored at `~/.conjra/vault/`
- API calls go directly from your machine to the provider's API — nothing in between
- No telemetry, no analytics, no phone-home

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-provider`
3. Add your provider tool file in `src/mcp/tools/`
4. Add the provider auth config in `src/auth/providers.ts`
5. Add the provider base URL in `src/api/client.ts`
6. Import your tools in `src/mcp/registry.ts`
7. Run `npx tsc --noEmit` to verify types
8. Submit a pull request

---

## License

MIT