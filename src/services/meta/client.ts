import type { ChannelPlatform } from "@/domain/core";

type JsonRecord = Record<string, unknown>;

function version() {
  return process.env.META_GRAPH_VERSION?.trim() || "v26.0";
}

async function post(url: string, accessToken: string, body: JsonRecord): Promise<JsonRecord> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  const json = await response.json().catch(()=>({})) as JsonRecord;
  if (!response.ok) {
    const error = json.error as JsonRecord | undefined;
    throw new Error(typeof error?.message === "string" ? error.message : `Meta HTTP ${response.status}`);
  }
  return json;
}

export async function sendText(input: {
  platform: ChannelPlatform;
  channelExternalId: string;
  contactExternalId: string;
  accessToken: string;
  text: string;
}) {
  if (input.platform === "whatsapp") {
    const raw = await post(
      `https://graph.facebook.com/${version()}/${encodeURIComponent(input.channelExternalId)}/messages`,
      input.accessToken,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.contactExternalId,
        type: "text",
        text: { preview_url: false, body: input.text },
      },
    );
    const messages = Array.isArray(raw.messages) ? raw.messages : [];
    const first = messages[0] as JsonRecord | undefined;
    return { externalMessageId: typeof first?.id === "string" ? first.id : undefined, raw };
  }

  if (input.platform === "instagram") {
    const raw = await post(
      `https://graph.instagram.com/${version()}/${encodeURIComponent(input.channelExternalId)}/messages`,
      input.accessToken,
      { recipient: { id: input.contactExternalId }, message: { text: input.text } },
    );
    return { externalMessageId: typeof raw.message_id === "string" ? raw.message_id : undefined, raw };
  }

  const raw = await post(
    `https://graph.facebook.com/${version()}/${encodeURIComponent(input.channelExternalId)}/messages`,
    input.accessToken,
    {
      recipient: { id: input.contactExternalId },
      messaging_type: "RESPONSE",
      message: { text: input.text },
    },
  );
  return { externalMessageId: typeof raw.message_id === "string" ? raw.message_id : undefined, raw };
}
