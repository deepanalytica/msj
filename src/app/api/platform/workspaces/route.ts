import { NextResponse } from "next/server";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

export async function GET() {
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: platformAdmin } = await admin
    .from("platform_admin")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!platformAdmin) return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  const { data: workspaces, error } = await admin
    .from("workspace")
    .select("id,name,slug,status,created_at")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (workspaces ?? []).map((w)=>w.id);
  const subscriptionQuery = ids.length
    ? await admin.from("workspace_subscription").select("workspace_id,plan_code,status").in("workspace_id", ids)
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
