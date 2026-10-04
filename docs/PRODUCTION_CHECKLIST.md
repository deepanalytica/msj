# MSJ — Production activation checklist

The application code and Cloudflare builds can be production-ready while third-party
accounts are still unprovisioned. Do not call a customer environment "live" until
every item below is complete.

## A. Repository / IP

- [ ] Decide open-source/open-core vs proprietary.
- [ ] If proprietary, make `deepanalytica/msj` private.
- [ ] Protect `main`: require CI and review before merge.
- [ ] Enable secret scanning / Dependabot alerts.

## B. Supabase

Create a dedicated MSJ production project.

Apply:
1. `0001_core.sql`
2. `0002_platform_billing_security.sql`
3. `0003_conversation_runtime.sql`

Then:
- [ ] configure Auth email confirmation / recovery;
- [ ] enable production backups;
- [ ] verify RLS with two test workspaces;
- [ ] create the first `platform_admin` only after the user's auth account exists;
- [ ] record restore procedure and recovery ownership.

## C. GitHub Actions secrets

Required:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MSJ_CREDENTIALS_KEY
MSJ_INTERNAL_SECRET
META_APP_SECRET
META_VERIFY_TOKEN
```

Optional until AI is enabled:

```text
OPENAI_API_KEY
```

Recommended repository variable:

```text
MSJ_EVENTS_URL=https://<msj-domain>/api/internal/meta-events
```

Never paste production secrets into issues, commits, chats or customer support tickets.

## D. Cloudflare

Deployments:
- [ ] `msj` application Worker;
- [ ] `msj-meta-gateway` webhook Worker;
- [ ] `msj-meta-events` Queue.

Security:
- [ ] protect login/public API with Cloudflare rate limiting;
- [ ] configure WAF managed rules;
- [ ] alerts for elevated 5xx;
- [ ] alerts for queue retries / dead-letter conditions;
- [ ] bind production custom domain;
- [ ] validate CSP/HSTS headers on the real domain.

## E. Meta

For an internal pilot, a channel may be connected manually from MSJ Setup.

For scalable customer self-onboarding, complete Meta Embedded Signup:
- [ ] production Meta Business App;
- [ ] Facebook Login for Business configuration;
- [ ] WhatsApp Embedded Signup configuration;
- [ ] App Review;
- [ ] Advanced Access to required business/WhatsApp permissions;
- [ ] webhook product configured;
- [ ] HTTPS production domain allowed for the JavaScript SDK / OAuth;
- [ ] WABA app subscription;
- [ ] phone registration path tested.

Do not promise one-click WhatsApp onboarding commercially until Meta App Review and
the production Embedded Signup flow are approved.

## F. AI

- [ ] provider API key stored only in Cloudflare secret storage;
- [ ] default assistant disabled on workspace creation;
- [ ] test HUMAN takeover;
- [ ] test tool timeout and failure paths;
- [ ] verify monthly quota enforcement;
- [ ] verify expired trial stops automation;
- [ ] verify sensitive tool forces human takeover;
- [ ] enable cost anomaly alerts.

## G. Smoke tests

Minimum production acceptance:

1. User signup.
2. Workspace creation.
3. Channel connection.
4. Meta webhook signature success and invalid-signature rejection.
5. One inbound WhatsApp message.
6. Message visible in Inbox.
7. AI reply.
8. Human takeover.
9. Human reply.
10. Duplicate webhook does not duplicate reply.
11. Failed integration does not fabricate success.
12. Workspace suspension stops outbound operation.
13. Separate second workspace cannot read first tenant.
14. Platform admin can inspect status but normal customer cannot open `/control`.
15. Audit event exists for administrative actions.

## H. Commercial launch

- [ ] terms of service;
- [ ] privacy notice;
- [ ] data processing terms where required;
- [ ] support address and incident contact;
- [ ] published plan limits;
- [ ] manual invoice/transfer workflow documented;
- [ ] trial expiration communication;
- [ ] customer offboarding/export and retention procedure.

Production launch is a gate, not a marketing label.
