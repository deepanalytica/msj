import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/services/crypto";
import { sendText } from "@/services/meta/client";
import { recordOutbound } from "@/services/runtime/repository";

const schema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Respuesta inválida." }, { status: 400 });

  const admin = createAdminClient();
  const { data: membership } = await admin.from("workspace_member")
    .select("workspace_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if (!membership || !["owner","admin","agent"].includes(membership.role)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const { data: conversation } = await admin.from("conversation")
    .select("id,contact_id,channel_connection_id")
    .eq("workspace_id", membership.workspace_id)
    .eq("id", parsed.data.conversationId)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });

  const [{ data: channel }, { data: identity }] = await Promise.all([
    admin.from("channel_connection")
      .select("id,platform,external_account_id,credential_ciphertext,credential_iv")
      .eq("workspace_id", membership.workspace_id)
      .eq("id", conversation.channel_connection_id)
      .single(),
    admin.from("external_identity")
      .select("external_user_id")
      .eq("workspace_id", membership.workspace_id)
      .eq("channel_connection_id", conversation.channel_connection_id)
      .eq("contact_id", conversation.contact_id)
      .single(),
  ]);

  if (!channel || !identity) return NextResponse.json({ error: "Canal incompleto." }, { status: 409 });

  const key = process.env.MSJ_CREDENTIALS_KEY;
  if (!key) return NextResponse.json({ error: "MSJ_CREDENTIALS_KEY missing." }, { status: 503 });

  try {
    const accessToken = await decryptSecret(channel.credential_ciphertext, channel.credential_iv, key);
    const sent = await sendText({
      platform: channel.platform,
      channelExternalId: channel.external_account_id,
      contactExternalId: identity.external_user_id,
      accessToken,
      text: parsed.data.text,
    });

    await recordOutbound({
      workspaceId: membership.workspace_id,
      conversationId: conversation.id,
      channelConnectionId: channel.id,
      externalMessageId: sent.externalMessageId,
      body: parsed.data.text,
      payload: sent.raw,
    });

    await admin.from("conversation").update({
      mode: "human",
      updated_at: new Date().toISOString(),
    }).eq("id", conversation.id);

    await admin.from("audit_event").insert({
      workspace_id: membership.workspace_id,
      actor_user_id: user.id,
      action: "conversation.human_reply",
      target_type: "conversation",
      target_id: conversation.id,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar." },
      { status: 502 },
    );
  }
}
