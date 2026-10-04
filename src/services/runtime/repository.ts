import type { ChannelPlatform, NormalizedInboundMessage } from "@/domain/core";
import { createAdminClient } from "@/lib/supabase/server";

export type ChannelConnection = {
  id: string;
  workspace_id: string;
  platform: ChannelPlatform;
  external_account_id: string;
  credential_ciphertext: string;
  credential_iv: string;
  status: string;
};

export type Conversation = {
  id: string;
  workspace_id: string;
  channel_connection_id: string;
  contact_id: string;
  mode: "ai" | "human" | "paused";
  status: "open" | "closed";
};

export type StoredInbound = {
  connection: ChannelConnection;
  conversation: Conversation;
  contactId: string;
  messageId: string;
  duplicate: boolean;
};

function dbError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function persistInbound(inbound: NormalizedInboundMessage): Promise<StoredInbound> {
  const db = createAdminClient();

  const { data: connection, error: connectionError } = await db
    .from("channel_connection")
    .select("*")
    .eq("platform", inbound.platform)
    .eq("external_account_id", inbound.channelExternalId)
    .eq("status", "active")
    .maybeSingle();
  dbError(connectionError, "channel_connection");
  if (!connection) throw new Error("No active channel connection for inbound account.");
  const typedConnection = connection as ChannelConnection;

  const { data: identity, error: identityError } = await db
    .from("external_identity")
    .select("contact_id")
    .eq("channel_connection_id", typedConnection.id)
    .eq("external_user_id", inbound.contactExternalId)
    .maybeSingle();
  dbError(identityError, "external_identity");

  let contactId = identity?.contact_id as string | undefined;
  if (!contactId) {
    const { data: contact, error } = await db.from("contact").insert({
      workspace_id: typedConnection.workspace_id,
      display_name: inbound.contactDisplayName ?? null,
    }).select("id").single();
    dbError(error, "contact");
    if (!contact) throw new Error("Contact insert returned no row.");
    contactId = contact.id as string;

    const { error: createIdentityError } = await db.from("external_identity").insert({
      workspace_id: typedConnection.workspace_id,
      contact_id: contactId,
      channel_connection_id: typedConnection.id,
      external_user_id: inbound.contactExternalId,
      profile: inbound.contactDisplayName ? { display_name: inbound.contactDisplayName } : {},
    });
    dbError(createIdentityError, "external_identity insert");
  }

  const month = new Date().toISOString().slice(0, 7) + "-01";
  const { data: existingMonthly } = await db
    .from("active_contact_monthly")
    .select("contact_id")
    .eq("workspace_id", typedConnection.workspace_id)
    .eq("contact_id", contactId)
    .eq("month", month)
    .maybeSingle();

  let activeContactIncrement = 0;
  if (!existingMonthly) {
    const { error } = await db.from("active_contact_monthly").insert({
      workspace_id: typedConnection.workspace_id,
      contact_id: contactId,
      month,
    });
    if (!error) activeContactIncrement = 1;
  }

  const { data: existingConversation, error: conversationError } = await db
    .from("conversation")
    .select("*")
    .eq("channel_connection_id", typedConnection.id)
    .eq("contact_id", contactId)
    .eq("status", "open")
    .maybeSingle();
  dbError(conversationError, "conversation read");

  let conversation = existingConversation as Conversation | null;
  if (!conversation) {
    const { data: created, error } = await db.from("conversation").insert({
      workspace_id: typedConnection.workspace_id,
      channel_connection_id: typedConnection.id,
      contact_id: contactId,
      mode: "ai",
      status: "open",
      last_message_at: inbound.occurredAt,
    }).select("*").single();
    dbError(error, "conversation insert");
    if (!created) throw new Error("Conversation insert returned no row.");
    conversation = created as Conversation;
  } else {
    await db.from("conversation").update({
      last_message_at: inbound.occurredAt,
      updated_at: new Date().toISOString(),
    }).eq("id", conversation.id);
  }

  const { data: existingMessage, error: messageReadError } = await db
    .from("message")
    .select("id")
    .eq("external_message_id", inbound.externalMessageId)
    .maybeSingle();
  dbError(messageReadError, "message dedupe");

  if (existingMessage) {
    return {
      connection: typedConnection,
      conversation,
      contactId,
      messageId: existingMessage.id as string,
      duplicate: true,
    };
  }

  const { data: message, error: messageError } = await db.from("message").insert({
    workspace_id: typedConnection.workspace_id,
    conversation_id: conversation.id,
    channel_connection_id: typedConnection.id,
    external_message_id: inbound.externalMessageId,
    direction: "inbound",
    kind: inbound.kind,
    body: inbound.body,
    payload: inbound.raw,
    status: "received",
    automation_state: "pending",
    automation_updated_at: new Date().toISOString(),
    occurred_at: inbound.occurredAt,
  }).select("id").single();
  dbError(messageError, "message insert");
  if (!message) throw new Error("Message insert returned no row.");

  await db.rpc("record_usage", {
    p_workspace_id: typedConnection.workspace_id,
    p_active_contact: activeContactIncrement,
    p_inbound: 1,
  });

  return {
    connection: typedConnection,
    conversation,
    contactId,
    messageId: message.id as string,
    duplicate: false,
  };
}

export async function claimInbound(messageId: string): Promise<boolean> {
  const db = createAdminClient();
  const now = new Date();
  const stale = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  await db.from("message").update({
    automation_state: "failed",
    automation_updated_at: now.toISOString(),
  }).eq("id", messageId).eq("automation_state", "processing").lt("automation_updated_at", stale);

  const { data, error } = await db.from("message").update({
    automation_state: "processing",
    automation_updated_at: now.toISOString(),
  }).eq("id", messageId).in("automation_state", ["pending","failed"]).select("id").maybeSingle();
  dbError(error, "claim inbound");
  return Boolean(data);
}

export async function setAutomationState(messageId: string, state: "completed" | "failed" | "skipped") {
  const db = createAdminClient();
  const { error } = await db.from("message").update({
    automation_state: state,
    automation_updated_at: new Date().toISOString(),
  }).eq("id", messageId);
  dbError(error, "automation state");
}

export async function getAssistantProfile(workspaceId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from("assistant_profile")
    .select("id,enabled,model,system_prompt,max_history_messages")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  dbError(error, "assistant profile");
  return data ?? null;
}

export async function getRecentMessages(conversationId: string, limit: number) {
  const db = createAdminClient();
  const { data, error } = await db.from("message")
    .select("direction,body,occurred_at")
    .eq("conversation_id", conversationId)
    .order("occurred_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 30)));
  dbError(error, "recent messages");
  return (data ?? []).reverse();
}

export async function getExternalUserId(channelConnectionId: string, contactId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from("external_identity")
    .select("external_user_id")
    .eq("channel_connection_id", channelConnectionId)
    .eq("contact_id", contactId)
    .single();
  dbError(error, "external user");
  if (!data) throw new Error("External identity missing.");
  return data.external_user_id as string;
}

export async function recordOutbound(input: {
  workspaceId: string;
  conversationId: string;
  channelConnectionId: string;
  externalMessageId?: string;
  body: string;
  payload?: unknown;
}) {
  const db = createAdminClient();
  const { error } = await db.from("message").insert({
    workspace_id: input.workspaceId,
    conversation_id: input.conversationId,
    channel_connection_id: input.channelConnectionId,
    external_message_id: input.externalMessageId ?? null,
    direction: "outbound",
    kind: "text",
    body: input.body,
    payload: input.payload ?? {},
    status: "sent",
    occurred_at: new Date().toISOString(),
  });
  dbError(error, "outbound message");
  await db.rpc("record_usage", { p_workspace_id: input.workspaceId, p_outbound: 1 });
}

export async function setConversationMode(conversationId: string, mode: "ai" | "human" | "paused") {
  const db = createAdminClient();
  const { error } = await db.from("conversation")
    .update({ mode, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  dbError(error, "conversation mode");
}

export async function workspaceCanUseAI(workspaceId: string) {
  const db = createAdminClient();
  const month = new Date().toISOString().slice(0, 7) + "-01";
  const [{ data: workspace }, { data: subscription }, { data: usage }] = await Promise.all([
    db.from("workspace").select("status").eq("id", workspaceId).single(),
    db.from("workspace_subscription").select("plan_code,status").eq("workspace_id", workspaceId).maybeSingle(),
    db.from("usage_monthly").select("ai_replies").eq("workspace_id", workspaceId).eq("month", month).maybeSingle(),
  ]);

  if (workspace?.status !== "active") return { allowed: false, reason: "workspace_inactive" };
  if (subscription && !["trialing","active"].includes(subscription.status)) {
    return { allowed: false, reason: "subscription_inactive" };
  }

  const planCode = subscription?.plan_code ?? "starter";
  const limits: Record<string, number | null> = {
    starter: 3000,
    growth: 15000,
    scale: 60000,
    enterprise: null,
  };
  const limit = limits[planCode] ?? 5000;
  if (limit !== null && (usage?.ai_replies ?? 0) >= limit) {
    return { allowed: false, reason: "ai_limit_reached" };
  }
  return { allowed: true, reason: null };
}
