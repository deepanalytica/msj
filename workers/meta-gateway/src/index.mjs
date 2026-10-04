const encoder = new TextEncoder();

function hex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(secret, body) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body))));
}

async function verifyMeta(secret, body, header) {
  if (!secret || !header?.startsWith("sha256=")) return false;
  return constantTimeEqual(await hmac(secret, body), header.slice(7).toLowerCase());
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === env.META_VERIFY_TOKEN && challenge) {
        return new Response(challenge);
      }
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const body = await request.text();
    const valid = await verifyMeta(
      env.META_APP_SECRET,
      body,
      request.headers.get("x-hub-signature-256"),
    );
    if (!valid) return json({ error: "invalid_signature" }, 401);

    await env.META_EVENTS.send({ body });
    return json({ accepted: true });
  },

  async queue(batch, env) {
    for (const item of batch.messages) {
      const body = item.body?.body;
      if (typeof body !== "string") {
        item.ack();
        continue;
      }

      try {
        const signature = await hmac(env.MSJ_INTERNAL_SECRET, body);
        const response = await fetch(env.MSJ_EVENTS_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-msj-signature": `sha256=${signature}`,
          },
          body,
        });
        if (!response.ok) throw new Error(`MSJ events HTTP ${response.status}`);
        item.ack();
      } catch (error) {
        console.error("Meta queue delivery failed", error);
        item.retry();
      }
    }
  },
};
