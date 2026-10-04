# MSJ — Pricing and unit economics

## Commercial rule

MSJ charges for software. WhatsApp transport charges should remain attached to the
customer's own Meta Business / WABA whenever possible.

This keeps:
- transport margin risk out of MSJ;
- Meta billing transparent to the customer;
- account ownership with the customer;
- gross margin tied to software value instead of message arbitrage.

## Plans

| Plan | Monthly | Active contacts | AI replies | Seats | Channels | Integrations |
|---|---:|---:|---:|---:|---:|---:|
| Starter | USD 29 | 2,000 | 5,000 | 2 | 1 | 1 |
| Growth | USD 69 | 10,000 | 25,000 | 5 | 3 | 5 |
| Scale | USD 149 | 50,000 | 100,000 | 15 | 10 | 20 |
| Enterprise | custom | custom | custom | custom | custom | custom |

Suggested AI overage:
- Starter: USD 3 / 1,000 replies
- Growth: USD 2.50 / 1,000
- Scale: USD 2 / 1,000

Do not automatically bill overage until usage alerts and customer-facing counters are proven.

## AI cost model

Budget with a conservative standard reply envelope:
- 1,200 input tokens
- 250 output tokens

At GPT-5.6 Luna list pricing of USD 0.20 / 1M input and USD 1.20 / 1M output,
one such reply is approximately USD 0.00054 before tool/search-specific charges.

Approximate raw model cost:
- 5,000 replies ≈ USD 2.70
- 25,000 replies ≈ USD 13.50
- 100,000 replies ≈ USD 54.00

Actual cost must come from provider usage telemetry.

## Infrastructure baseline

Cloudflare Workers Paid starts at USD 5/account/month and includes 10M requests/month.
Production database cost is budgeted separately.

Infrastructure is shared across workspaces; gross margin improves with tenant density,
but security, support, database growth and external services belong in the real COGS model.

## Billing abstraction

`workspace_subscription.billing_provider` is nullable by design.

Initial modes:
1. manual invoice / bank transfer;
2. payment provider connected later;
3. enterprise contract.

Entitlements read from `workspace_subscription`, never directly from a vendor-specific object.
