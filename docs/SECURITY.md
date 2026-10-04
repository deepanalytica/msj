# MSJ Security Baseline

This is the minimum production security contract for MSJ.

## Tenant isolation

The security boundary is `workspace_id`.
Every customer-owned table includes it and enables Row Level Security.
Browser sessions never use a service-role credential.

## RBAC

Workspace roles:
- owner
- admin
- agent
- viewer

Platform roles are separate in `platform_admin`:
- operator
- security
- finance
- superadmin

Platform administration is never inferred from workspace ownership.

## Secrets

Meta access tokens, integration secrets and future OAuth refresh tokens:
- are server-only;
- are encrypted before persistence using AES-256-GCM;
- are never returned by read APIs;
- are never written to logs;
- must support rotation.

The database service role and encryption master key exist only as protected runtime secrets.

## Webhook trust

Meta webhooks:
1. verify `X-Hub-Signature-256` with the Meta App Secret;
2. ACK quickly;
3. enter a durable queue;
4. are normalized only after signature verification.

Gateway to MSJ traffic uses a second, independent HMAC secret.

## LLM boundary

Messages and attachments are untrusted input.

The model:
- receives no database credentials;
- has no generic SQL tool;
- may call only registered tools;
- cannot choose arbitrary URLs for server-side fetch;
- validates tool arguments against schema;
- uses idempotency keys on mutating tools;
- requires human confirmation for configured high-risk actions.

## Idempotency

Provider message IDs are unique.
Inbound processing moves through:
`pending → processing → completed|failed|skipped`.

Stale processing claims may be recovered after a bounded timeout.

## HTTP security

Production enables:
- HSTS;
- CSP;
- frame denial;
- MIME sniffing protection;
- restrictive permissions policy;
- strict referrer policy.

Cloudflare WAF/rate limiting should protect login, webhook and public API surfaces.

## Audit

Append-only audit events cover:
- workspace creation/suspension;
- channel connect/disconnect;
- assistant configuration;
- human takeover;
- tool calls;
- API key lifecycle;
- platform-admin actions.

Application users have read access only to their workspace trail.

## Abuse and cost containment

Apply:
- monthly entitlements;
- provider/API timeouts;
- max tool calls per turn;
- bounded history;
- attachment size/type limits;
- CPU/subrequest limits;
- usage alerts at 70%, 90% and 100%;
- workspace suspension switch.

## Backups and recovery

Production database:
- automatic backups enabled;
- restore procedure tested;
- encryption master key backed up separately;
- RPO/RTO documented before enterprise sales.

## Incident process

Severity:
- SEV0: active compromise/data exfiltration
- SEV1: cross-tenant exposure or widespread outage
- SEV2: tenant-local outage/security control failure
- SEV3: minor degradation

For SEV0/SEV1:
1. contain affected credentials/workspaces;
2. preserve logs;
3. rotate credentials;
4. assess tenant impact;
5. restore only after containment;
6. document root cause and preventive action.
