import type { ChannelPlatform, NormalizedInboundMessage } from "@/domain/core";

type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const string = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;

function timestampSeconds(value: unknown): string {
  const raw = string(value);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? new Date(n * 1000).toISOString() : new Date().toISOString();
}

function whatsappBody(message: JsonRecord): string {
  const type = string(message.type) ?? "unknown";
  if (type === "text") return string(record(message.text)?.body) ?? "";
  if (type === "button") return string(record(message.button)?.text) ?? "[button]";
  if (type === "interactive") {
    const interactive = record(message.interactive);
    const button = record(interactive?.button_reply);
    const list = record(interactive?.list_reply);
    return string(button?.title) ?? string(list?.title) ?? string(list?.description) ?? "[interactive]";
  }
  if (type === "image") return string(record(message.image)?.caption) ?? "[imagen]";
  if (type === "video") return string(record(message.video)?.caption) ?? "[video]";
  if (type === "document") return string(record(message.document)?.caption) ?? "[documento]";
  if (type === "audio") return "[audio]";
  if (type === "location") return "[ubicación]";
  return `[${type}]`;
}

function whatsapp(root: JsonRecord): NormalizedInboundMessage[] {
  const out: NormalizedInboundMessage[] = [];
  for (const entryUnknown of array(root.entry)) {
    const entry = record(entryUnknown);
    if (!entry) continue;
    for (const changeUnknown of array(entry.changes)) {
      const value = record(record(changeUnknown)?.value);
      const metadata = record(value?.metadata);
      const channelExternalId = string(metadata?.phone_number_id);
      if (!value || !channelExternalId) continue;

      const contacts = array(value.contacts).map(record).filter((v): v is JsonRecord => v !== null);
      for (const messageUnknown of array(value.messages)) {
        const message = record(messageUnknown);
        if (!message) continue;
        const from = string(message.from);
        const messageId = string(message.id);
        if (!from || !messageId) continue;
        const contact = contacts.find((c)=>string(c.wa_id) === from) ?? contacts[0];
        out.push({
          platform: "whatsapp",
          channelExternalId,
          contactExternalId: from,
          contactDisplayName: string(record(contact?.profile)?.name),
          externalMessageId: messageId,
          body: whatsappBody(message),
          kind: string(message.type) ?? "unknown",
          occurredAt: timestampSeconds(message.timestamp),
          raw: message,
        });
      }
    }
  }
  return out;
}

function messagingEnvelope(root: JsonRecord, platform: Extract<ChannelPlatform, "instagram" | "messenger">) {
  const out: NormalizedInboundMessage[] = [];
  for (const entryUnknown of array(root.entry)) {
    const entry = record(entryUnknown);
    const channelExternalId = string(entry?.id);
    if (!entry || !channelExternalId) continue;
    for (const eventUnknown of array(entry.messaging)) {
      const event = record(eventUnknown);
      const sender = record(event?.sender);
      const message = record(event?.message);
      if (!event || !sender || !message || message.is_echo === true) continue;
      const contactExternalId = string(sender.id);
      const externalMessageId = string(message.mid);
      if (!contactExternalId || !externalMessageId) continue;
      out.push({
        platform,
        channelExternalId,
        contactExternalId,
        externalMessageId,
        body: string(message.text) ?? (message.attachments ? "[adjunto]" : "[mensaje no textual]"),
        kind: message.attachments ? "attachment" : "text",
        occurredAt: typeof event.timestamp === "number" ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
        raw: event,
      });
    }
  }
  return out;
}

export function normalizeMetaWebhook(payload: unknown): NormalizedInboundMessage[] {
  const root = record(payload);
  if (!root) return [];
  const object = string(root.object);
  if (object === "whatsapp_business_account") return whatsapp(root);
  if (object === "instagram") return messagingEnvelope(root, "instagram");
  if (object === "page") return messagingEnvelope(root, "messenger");
  return [];
}
