import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceStatus: z.enum(["active","suspended","closed"]).optional(),
  planCode: z.enum(["starter","growth","scale","enterprise"]).optional(),
  subscriptionStatus: z.enum(["trialing","active","past_due","canceled","paused"]).optional(),
});

async function platformContext() {
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: platformAdmin } = await admin
    .from("platform_admin")
    .select("user_id,role")
    .eq("user_id", user.id)
    .maybeSingle();
  return platformAdmin ? { user, admin, platformAdmin } : null;
}

export async function GET() {
  const ctx = await platformContext();
  if (!ctx) return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  const { data: workspaces, error } = await ctx.admin
    .from("workspace")
    .select("id,name,slug,status,created_at")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (workspaces ?? []).map((w)=>w.id);
  const subscriptionQuery = ids.length
    ? await ctx.admin.from("workspace_subscription").select("workspace_id,plan_code,status").in("workspace_id", ids)
    : { data: [] as Array<{workspace_id:string;plan_code:string;status:string}> };

  const subscriptionMap = new Map((subscriptionQuery.data ?? []).map((s)=>[s.workspace_id, s]));

  const rows = (workspaces ?? []).map((w)=>({
    ...w,
    plan_code: subscriptionMap.get(w.id)?.plan_code ?? "starter",
    subscription_status: subscriptionMap.get(w.id)?.status ?? "trialing",
  }));

  return NextResponse.json({
    totals: {
      workspaces: rows.length,
      active: rows.filter((w)=>w.status === "active").length,
      suspended: rows.filter((w)=>w.status === "suspended").length,
      trialing: rows.filter((w)=>w.subscription_status === "trialing").length,
    },
    workspaces: rows,
  });
}

export async function PATCH(request: Request) {
  const ctx = await platformContext();
  if (!ctx) return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const role = ctx.platformAdmin.role as string;
  const wantsBillingChange = Boolean(parsed.data.planCode || parsed.data.subscriptionStatus);
  const wantsWorkspaceChange = Boolean(parsed.data.workspaceStatus);

  if (wantsBillingChange && !["finance","superadmin"].includes(role)) {
    return NextResponse.json({ error: "Rol insuficiente para billing." }, { status: 403 });
  }
  if (wantsWorkspaceChange && !["operator","security","superadmin"].includes(role)) {
    return NextResponse.json({ error: "Rol insuficiente para estado del workspace." }, { status: 403 });
  }

  if (parsed.data.workspaceStatus) {
    const { error } = await ctx.admin.from("workspace")
      .update({ status: parsed.data.workspaceStatus })
      .eq("id", parsed.data.workspaceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.planCode || parsed.data.subscriptionStatus) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.planCode) patch.plan_code = parsed.data.planCode;
    if (parsed.data.subscriptionStatus) patch.status = parsed.data.subscriptionStatus;

    const { error } = await ctx.admin.from("workspace_subscription")
      .update(patch)
      .eq("workspace_id", parsed.data.workspaceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await ctx.admin.from("audit_event").insert({
    workspace_id: parsed.data.workspaceId,
    actor_user_id: ctx.user.id,
    action: "platform.workspace_updated",
    target_type: "workspace",
    target_id: parsed.data.workspaceId,
    metadata: {
      workspaceStatus: parsed.data.workspaceStatus ?? null,
      planCode: parsed.data.planCode ?? null,
      subscriptionStatus: parsed.data.subscriptionStatus ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
