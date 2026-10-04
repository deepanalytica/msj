import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/services/crypto";
import { PLANS, type PlanCode, planAllows } from "@/lib/plans";

const schema = z.object({
  platform: z.enum(["whatsapp","instagram","messenger"]),
  externalAccountId: z.string().trim().min(2).max(200),
  displayName: z.string().trim().max(100).optional(),
  accessToken: z.string().trim().min(20),
  metadata: z.record(z.unknown()).optional(),
});

async function context() {
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("workspace_member")
    .select("workspace_id,role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  return { user, admin, membership };
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data, error } = await ctx.admin.from("channel_connection")
    .select("id,platform,external_account_id,display_name,status,metadata,created_at")
    .eq("workspace_id", ctx.membership.workspace_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channels: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!["owner","admin"].includes(ctx.membership.role)) {
    return NextResponse.json({ error: "Se requiere rol owner o admin." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const [{ data: subscription }, { count }] = await Promise.all([
    ctx.admin.from("workspace_subscription").select("plan_code,status")
      .eq("workspace_id", ctx.membership.workspace_id).maybeSingle(),
    ctx.admin.from("channel_connection").select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.membership.workspace_id).eq("status","active"),
  ]);

  if (subscription && !["trialing","active"].includes(subscription.status)) {
    return NextResponse.json({ error: "La suscripción no permite nuevos canales." }, { status: 402 });
  }

  const plan = PLANS[(subscription?.plan_code ?? "starter") as PlanCode] ?? PLANS.starter;
  if (!planAllows(plan, "channels", count ?? 0)) {
    return NextResponse.json({ error: "Límite de canales alcanzado para el plan." }, { status: 409 });
  }

  const key = process.env.MSJ_CREDENTIALS_KEY;
  if (!key) return NextResponse.json({ error: "MSJ_CREDENTIALS_KEY missing." }, { status: 503 });

  const encrypted = await encryptSecret(parsed.data.accessToken, key);
  const { data, error } = await ctx.admin.from("channel_connection").insert({
    workspace_id: ctx.membership.workspace_id,
    platform: parsed.data.platform,
    external_account_id: parsed.data.externalAccountId,
    display_name: parsed.data.displayName ?? null,
    credential_ciphertext: encrypted.ciphertext,
    credential_iv: encrypted.iv,
    status: "active",
    metadata: parsed.data.metadata ?? {},
  }).select("id,platform,external_account_id,display_name,status,metadata").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await ctx.admin.from("audit_event").insert({
    workspace_id: ctx.membership.workspace_id,
    actor_user_id: ctx.user.id,
    action: "channel.connected",
    target_type: "channel_connection",
    target_id: data.id,
    metadata: { platform: parsed.data.platform },
  });

  return NextResponse.json({ channel: data }, { status: 201 });
}
