# MSJ — Conversation Infrastructure

MSJ is a standalone omnichannel SaaS for operating customer conversations across
WhatsApp, Instagram and Facebook Messenger using the official Meta APIs.

It is **not tied to Clinia**. Clinia is one optional Tool Provider, just like a CRM,
ERP, booking system, e-commerce backend or custom API.

## Product surfaces

- Public landing page: `/`
- Account access: `/login`
- Workspace Console: `/app`
- Live Inbox: `/app/conversations`
- Channel / AI / integration setup: `/app/setup`
- Internal Platform Control: `/control`

## Architecture

```text
Meta APIs
   |
Cloudflare Meta Gateway
   |
Cloudflare Queue
   |
MSJ Conversation Engine
   +-- workspace isolation
   +-- identity / conversation state
   +-- AI / HUMAN / PAUSED
   +-- plan entitlements
   +-- AI model runtime
   +-- Tool Router
         |
         +-- Clinia
         +-- CRM
         +-- ERP
         +-- Custom HTTPS provider
```

## Security baseline

- Supabase RLS by `workspace_id`
- workspace RBAC + separate platform-admin RBAC
- AES-256-GCM for stored channel/integration credentials
- Meta webhook signature validation
- independent HMAC between edge gateway and MSJ
- idempotent inbound processing
- safe HTTPS integration endpoints with private-address guards
- sensitive tools force human takeover
- append-only operational audit trail
- CSP/HSTS/security headers
- Cloudflare CPU/subrequest limits

See `docs/SECURITY.md`.

## Commercial plans

- Starter — USD 29/month
- Growth — USD 69/month
- Scale — USD 149/month
- Enterprise — custom

Meta/WhatsApp transport fees stay on the customer's own Meta account whenever possible.

See `docs/PRICING_AND_UNIT_ECONOMICS.md`.

## Database

Apply in order:

```text
supabase/migrations/0001_core.sql
supabase/migrations/0002_platform_billing_security.sql
supabase/migrations/0003_conversation_runtime.sql
```

## Environment

Copy `.env.example` and configure server-only secrets outside Git.

Generate the credential encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Cloudflare production

MSJ runs as a full-stack Next.js app on Cloudflare Workers via OpenNext.
The Meta webhook gateway is a separate Worker in `workers/meta-gateway`.

Production workflows:

- `.github/workflows/cloudflare-production.yml`
- `.github/workflows/cloudflare-meta-gateway.yml`

Required GitHub/Cloudflare deployment credentials:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Runtime secrets are documented in `.env.example`.

## Integration protocol

A Tool Provider exposes:

```text
GET  /v1/msj/tools
POST /v1/msj/execute
```

Both sides share an HMAC secret.

See `docs/CONNECTOR_PROTOCOL.md`.
