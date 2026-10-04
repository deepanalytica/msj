import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

const schema = z.object({ name: z.string().trim().min(2).max(80) });

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Nombre inválido." }, { status: 400 });

  const admin = createAdminClient();
  const existing = await admin
    .from("workspace_member")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if ((existing.data ?? []).length > 0) {
    return NextResponse.json({ error: "La cuenta ya pertenece a un workspace." }, { status: 409 });
  }

  const base = slugify(parsed.data.name) || "workspace";
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;

  const { data: workspace, error: workspaceError } = await admin
    .from("workspace")
    .insert({ name: parsed.data.name, slug, status: "active" })
    .select("id,name,slug,status")
    .single();

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: workspaceError?.message ?? "No se pudo crear." }, { status: 500 });
  }

  const { error: memberError } = await admin.from("workspace_member").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    await admin.from("workspace").delete().eq("id", workspace.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  await admin.from("workspace_subscription").insert({
    workspace_id: workspace.id,
    plan_code: "starter",
    status: "trialing",
    trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
  });

  await admin.from("audit_event").insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    action: "workspace.created",
    target_type: "workspace",
    target_id: workspace.id,
    metadata: {},
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
