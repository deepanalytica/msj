# MSJ Meta Gateway

Public edge gateway for Meta webhooks.

Responsibilities:
1. verify Meta webhook challenge;
2. verify `X-Hub-Signature-256`;
3. ACK quickly;
4. enqueue the raw event;
5. deliver to MSJ with an independent HMAC signature.

The gateway never stores channel access tokens.

## Secrets

```bash
wrangler secret put META_VERIFY_TOKEN
wrangler secret put META_APP_SECRET
wrangler secret put MSJ_INTERNAL_SECRET
wrangler secret put MSJ_EVENTS_URL
```

`MSJ_EVENTS_URL` points to:

```text
https://YOUR-MSJ/api/internal/meta-events
```

## Queue

```bash
wrangler queues create msj-meta-events
npm install
npm run deploy
```
