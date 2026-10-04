import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  conversationId: z.string().uuid(),
  mode: z.enum(["ai","human","paused"]),
});

async function context() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase.from("workspace_member")
    .select("workspace_id,role").eq("user_id", user.id).limit(1).maybeSingle();
  return membership ? { supabase, user, membership } : null;
}

export async function GET(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversation");

  if (conversationId) {
    const { data: messages, error } = await ctx.supabase.from("message")
      .select("id,direction,kind,body,status,occurred_at")
      .eq("workspace_id", ctx.membership.workspace_id)
      .eq("conversation_id", conversationId)
      .order("occurred_at", { ascending: true })
      .limit(250);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: messages ?? [] });
  }

  const { data: conversations, error } = await ctx.supabase.from("conversation")
    .select("id,contact_id,channel_connection_id,mode,status,last_message_at")
    .eq("workspace_id", ctx.membership.workspace_id)
    .eq("status","open")
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = conversations ?? [];
  const contactIds = [...new Set(rows.map((r)=>r.contact_id))];
  const channelIds = [...new Set(rows.map((r)=>r.channel_connection_id))];

  const [contactsRes, channelsRes] = await Promise.all([
    contactIds.length
      ? ctx.supabase.from("contact").select("id,display_name,email,phone").in("id",contactIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    channelIds.length
      ? ctx.supabase.from("channel_connection").select("id,platform,display_name").in("id",channelIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const contactMap = new Map((contactsRes.data ?? []).map((c:any)=>[c.id,c]));
  const channelMap = new Map((channelsRes.data ?? []).map((c:any)=>[c.id,c]));

  return NextResponse.json({
    conversations: rows.map((row)=>({
      ...row,
      contact: contactMap.get(row.contact_id) ?? null,
      channel: channelMap.get(row.channel_connection_id) ?? null,
    })),
  });
}

export async function PATCH(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!["owner","admin","agent"].includes(ctx.membership.role)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const { error } = await ctx.supabase.from("conversation")
    .update({ mode: parsed.data.mode, updated_at: new Date().toISOString() })
    .eq("workspace_id", ctx.membership.workspace_id)
    .eq("id", parsed.data.conversationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
