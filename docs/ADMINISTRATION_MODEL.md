# MSJ — Administration model

## Operating objective

MSJ must remain operable without one-off database work per customer.
Anything required every week belongs in Platform Control, automation or a runbook.

## Baseline economics

Current reference infrastructure:
- Cloudflare Workers Paid: USD 5/month minimum.
- Supabase Pro: USD 25/month baseline for the first production project.
- Meta transport: excluded from MSJ COGS when the customer owns/pays its WABA.
- AI: usage-based.

Using the standard planning envelope of 1,200 input + 250 output tokens on GPT-5.6 Luna:
- estimated raw model cost / reply: USD 0.00054;
- Starter full allowance (3,000): ~USD 1.62;
- Growth full allowance (15,000): ~USD 8.10;
- Scale full allowance (60,000): ~USD 32.40.

These are planning values. Production accounting must use metered provider usage.

## Support budget targets

To preserve margin, design the product so average human support stays under:

| Plan | Target human support | Internal budget at USD 15/h |
|---|---:|---:|
| Starter | 12 min / month | USD 3.00 |
| Growth | 25 min / month | USD 6.25 |
| Scale | 60 min / month | USD 15.00 |

Support above these targets is a product/UX signal, not merely a staffing problem.

## 100-customer scenario

Mix:
- 60 Starter × USD 29 = USD 1,740
- 30 Growth × USD 79 = USD 2,370
- 10 Scale × USD 179 = USD 1,790

Total MRR: **USD 5,900**

At 100% included AI usage:
- model budget ≈ USD 664.20
- support budget ≈ USD 517.50
- conservative shared infra budget: USD 150

Indicative COGS ≈ USD 1,331.70
Indicative gross margin ≈ **77.4%**

At 50% AI utilization, indicative gross margin rises to roughly **83%**.

This excludes taxes, sales commissions, acquisition spend, refunds and payment-processing fees.

## Administration stages

### 0–50 workspaces
Owner/operator can run platform with automated alerts.
Target:
- < 60 minutes/day routine support/ops;
- weekly usage and failed-tool review;
- monthly restore test/check;
- no manual SQL for customer-facing actions.

### 50–250 workspaces
Add dedicated customer success/support capacity.
Platform Control becomes source of truth for:
- subscription state;
- tenant suspension;
- usage;
- channel health;
- incidents.

### 250–1,000 workspaces
Separate support from platform operations.
Introduce:
- formal on-call;
- alert routing;
- security review cadence;
- database capacity planning;
- customer health scoring;
- incident postmortems.

### 1,000+ workspaces
Move toward:
- dedicated SRE/platform ownership;
- security owner;
- enterprise support tier;
- regional/data-residency strategy where commercially required.

## Daily automated checks

Alert on:
- webhook signature failures;
- queue retries above threshold;
- provider 401/403 errors;
- AI usage anomalies;
- workspace >70%, 90%, 100% quota;
- integration timeout/error rate;
- cross-tenant RLS/security test failure.

## Weekly operator review

Platform Control should surface:
- MRR by plan;
- trial conversion;
- churn/past_due;
- AI cost by workspace;
- support-heavy accounts;
- inactive/broken channels;
- tool-call failure rate;
- security events.

## Monthly business review

Calculate:
- revenue;
- model cost;
- database/edge cost;
- support time;
- gross margin by plan;
- CAC payback;
- expansion MRR;
- churn;
- active workspaces / total workspaces.

No pricing decision should be made from raw message volume alone.
