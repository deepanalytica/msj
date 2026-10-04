import { describe, expect, it } from "vitest";
import { normalizeMetaWebhook } from "@/services/meta/normalize";

describe("Meta normalization", () => {
  it("normalizes WhatsApp inbound text", () => {
    const messages = normalizeMetaWebhook({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: "phone-1" },
            contacts: [{ wa_id: "5691", profile: { name: "María" } }],
            messages: [{ from: "5691", id: "wamid.1", timestamp: "1760000000", type: "text", text: { body: "Hola" } }],
          },
        }],
      }],
    });
    expect(messages[0]).toMatchObject({
      platform: "whatsapp",
      channelExternalId: "phone-1",
      contactExternalId: "5691",
      body: "Hola",
    });
  });

  it("ignores WhatsApp status-only events", () => {
    expect(normalizeMetaWebhook({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ value: { statuses: [{ id: "x" }] } }] }],
    })).toEqual([]);
  });
});
