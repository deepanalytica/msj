import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

const schema = z.object({
  enabled: z.boolean(),
  model: z.string().trim().min(2).max(100),
  systemPrompt: z.string().max(8000),
  maxHistoryMessages: z.number().int().min(1).max(30),
});

async function context() {
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: membership } = await admin.from("workspace_member")
    .select("workspace_id,role").eq("user_id", user.id).limit(1).maybeSingle();
  return membership ? { user, admin, membership } : null;
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { data, error } = await ctx.admin.from("assistant_profile")
    .select("enabled,model,system_prompt,max_history_messages")
    .eq("workspace_id", ctx.membership.workspace_id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    assistant: data ?? {
      enabled: false,
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      system_prompt: "",
      max_history_messages: 12,
    },
  });
}

export async function PUT(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!["owner","admin"].includes(ctx.membership.role)) {
    return NextResponse.json({ error: "Se requiere rol owner o admin." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Configuración inválida." }, { status: 400 });

  const { data, error } = await ctx.admin.from("assistant_profile").upsert({
    workspace_id: ctx.membership.workspace_id,
    name: "Asistente",
    enabled: parsed.data.enabled,
    model: parsed.data.model,
    system_prompt: parsed.data.systemPrompt,
    max_history_messages: parsed.data.maxHistoryMessages,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id" })
    .select("enabled,model,system_prompt,max_history_messages")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await ctx.admin.from("audit_event").insert({
    workspace_id: ctx.membership.workspace_id,
    actor_user_id: ctx.user.id,
    action: "assistant.updated",
    target_type: "assistant_profile",
    target_id: ctx.membership.workspace_id,
    metadata: { enabled: parsed.data.enabled, model: parsed.data.model },
  });

  return NextResponse.json({ assistant: data });
}
