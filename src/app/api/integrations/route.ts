import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/services/crypto";
import { PLANS, type PlanCode, planAllows } from "@/lib/plans";

const schema = z.object({
  providerType: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(80),
  baseUrl: z.string().url(),
  secret: z.string().min(16),
  metadata: z.record(z.unknown()).optional(),
});

function assertSafeUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Solo se permiten integraciones HTTPS.");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) throw new Error("No se permiten endpoints privados/locales.");
  return url.toString();
}

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
  return membership ? { user, admin, membership } : null;
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data, error } = await ctx.admin.from("integration")
    .select("id,provider_type,name,base_url,enabled,metadata,created_at")
    .eq("workspace_id", ctx.membership.workspace_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integrations: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!["owner","admin"].includes(ctx.membership.role)) {
    return NextResponse.json({ error: "Se requiere rol owner o admin." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  let baseUrl: string;
  try { baseUrl = assertSafeUrl(parsed.data.baseUrl); }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "URL inválida." }, { status: 400 });
  }

  const [{ data: subscription }, { count }] = await Promise.all([
    ctx.admin.from("workspace_subscription").select("plan_code,status")
      .eq("workspace_id", ctx.membership.workspace_id).maybeSingle(),
    ctx.admin.from("integration").select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.membership.workspace_id).eq("enabled", true),
  ]);

  const plan = PLANS[(subscription?.plan_code ?? "starter") as PlanCode] ?? PLANS.starter;
  if (!planAllows(plan, "integrations", count ?? 0)) {
    return NextResponse.json({ error: "Límite de integraciones alcanzado para el plan." }, { status: 409 });
  }

  const key = process.env.MSJ_CREDENTIALS_KEY;
  if (!key) return NextResponse.json({ error: "MSJ_CREDENTIALS_KEY missing." }, { status: 503 });
  const encrypted = await encryptSecret(parsed.data.secret, key);

  const { data, error } = await ctx.admin.from("integration").insert({
    workspace_id: ctx.membership.workspace_id,
    provider_type: parsed.data.providerType,
    name: parsed.data.name,
    base_url: baseUrl,
    secret_ciphertext: encrypted.ciphertext,
    secret_iv: encrypted.iv,
    enabled: true,
    metadata: parsed.data.metadata ?? {},
  }).select("id,provider_type,name,base_url,enabled,metadata").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await ctx.admin.from("audit_event").insert({
    workspace_id: ctx.membership.workspace_id,
    actor_user_id: ctx.user.id,
    action: "integration.connected",
    target_type: "integration",
    target_id: data.id,
    metadata: { providerType: parsed.data.providerType },
  });

  return NextResponse.json({ integration: data }, { status: 201 });
}
