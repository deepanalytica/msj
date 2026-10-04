# MSJ Platform Operations

## Two consoles

### Workspace Console
Customer-facing:
- conversations;
- channels;
- assistant;
- integrations;
- team;
- audit;
- usage/billing.

### Platform Control
Internal only:
- tenants;
- plan/subscription status;
- usage;
- channel health;
- queue failures;
- security events;
- support/incident context;
- suspension.

## Provisioning

1. User creates account.
2. Server creates workspace and owner membership.
3. Starter 14-day trial is created.
4. Owner connects a Meta channel.
5. Assistant remains PAUSED until configuration passes validation.
6. First live message becomes the smoke test.
7. Usage metering starts with the first inbound contact/message.

## Subscription state

`trialing → active → past_due|paused|canceled`

Operational policy:
- trialing: full Starter limits;
- past_due: grace period, no new channels/integrations;
- paused: inbound may be retained but automation disabled;
- canceled: read-only export window, then retention policy applies.

## Usage metering

Monthly ledger:
- active_contacts
- ai_replies
- ai_input_tokens
- ai_output_tokens
- inbound_messages
- outbound_messages
- media_bytes

Meters update server-side only.

## Support runbook

Every support case identifies:
- workspace ID;
- channel connection ID;
- external message ID;
- conversation ID;
- latest audit events;
- latest security events;
- queue/retry state.

Never ask customers to send access tokens over chat/email.

## Cost governance

Daily:
- AI token anomaly detection;
- queue failure rate;
- webhook signature failures.

Weekly:
- per-workspace AI cost;
- highest-volume tenants;
- storage growth;
- failed tool calls.

Monthly:
- gross margin by plan;
- infra cost per active workspace;
- support minutes per account;
- expansion/contraction usage.
