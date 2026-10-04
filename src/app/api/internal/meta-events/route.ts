import { NextResponse } from "next/server";
import { normalizeMetaWebhook } from "@/services/meta/normalize";
import { decryptSecret, verifySignatureHeader } from "@/services/crypto";
import { sendText } from "@/services/meta/client";
import { answerMessage } from "@/services/runtime/assistant";
import {
  claimInbound,
  getAssistantProfile,
  getExternalUserId,
  getRecentMessages,
  persistInbound,
  recordOutbound,
  setAutomationState,
  setConversationMode,
  workspaceCanUseAI,
} from "@/services/runtime/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const internalSecret = process.env.MSJ_INTERNAL_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "MSJ_INTERNAL_SECRET missing." }, { status: 503 });
  }

  const valid = await verifySignatureHeader(
    internalSecret,
    rawBody,
    request.headers.get("x-msj-signature"),
  );
  if (!valid) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const inboundMessages = normalizeMetaWebhook(payload);
  const results: Array<Record<string, unknown>> = [];

  for (const inbound of inboundMessages) {
    let persisted: Awaited<ReturnType<typeof persistInbound>> | null = null;
    try {
      persisted = await persistInbound(inbound);

      const claimed = await claimInbound(persisted.messageId);
      if (!claimed) {
        results.push({
          externalMessageId: inbound.externalMessageId,
          status: "already_processed",
        });
        continue;
      }

      if (persisted.conversation.mode !== "ai") {
        await setAutomationState(persisted.messageId, "skipped");
        results.push({
          externalMessageId: inbound.externalMessageId,
          status: `stored_${persisted.conversation.mode}`,
        });
        continue;
      }

      const entitlement = await workspaceCanUseAI(persisted.connection.workspace_id);
      if (!entitlement.allowed) {
        await setConversationMode(persisted.conversation.id, "human");
        await setAutomationState(persisted.messageId, "skipped");
        results.push({
          externalMessageId: inbound.externalMessageId,
          status: entitlement.reason,
        });
        continue;
      }

      const profile = await getAssistantProfile(persisted.connection.workspace_id);
      if (!profile?.enabled) {
        await setAutomationState(persisted.messageId, "skipped");
        results.push({
          externalMessageId: inbound.externalMessageId,
          status: "assistant_disabled",
        });
        continue;
      }

      const credentialKey = process.env.MSJ_CREDENTIALS_KEY;
      if (!credentialKey) throw new Error("MSJ_CREDENTIALS_KEY missing.");

      const accessToken = await decryptSecret(
        persisted.connection.credential_ciphertext,
        persisted.connection.credential_iv,
        credentialKey,
      );
      const contactExternalId = await getExternalUserId(
        persisted.connection.id,
        persisted.contactId,
      );

      let replyText: string | null = null;
      let handedOff = false;

      if (!process.env.OPENAI_API_KEY) {
        await setConversationMode(persisted.conversation.id, "human");
        replyText = "Tu mensaje quedó en la bandeja del equipo. Una persona continuará la conversación.";
        handedOff = true;
      } else {
        const history = await getRecentMessages(
          persisted.conversation.id,
          profile.max_history_messages,
        );
        const reply = await answerMessage({
          workspaceId: persisted.connection.workspace_id,
          conversationId: persisted.conversation.id,
          body: inbound.body,
          history,
          profile,
        });
        replyText = reply.text;
        handedOff = reply.handedOff;
      }

      if (replyText) {
        const sent = await sendText({
          platform: persisted.connection.platform,
          channelExternalId: persisted.connection.external_account_id,
          contactExternalId,
          accessToken,
          text: replyText,
        });

        await recordOutbound({
          workspaceId: persisted.connection.workspace_id,
          conversationId: persisted.conversation.id,
          channelConnectionId: persisted.connection.id,
          externalMessageId: sent.externalMessageId,
          body: replyText,
          payload: sent.raw,
        });
      }

      await setAutomationState(persisted.messageId, "completed");
      results.push({
        externalMessageId: inbound.externalMessageId,
        status: handedOff ? "replied_handoff" : replyText ? "replied" : "completed_no_reply",
      });
    } catch (error) {
      if (persisted) {
        try { await setAutomationState(persisted.messageId, "failed"); } catch {}
      }
      console.error("MSJ inbound processing failed", {
        externalMessageId: inbound.externalMessageId,
        platform: inbound.platform,
        error: error instanceof Error ? error.message : "unknown",
      });
      return NextResponse.json(
        { error: "Inbound processing failed.", processed: results },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ count: results.length, processed: results });
}
