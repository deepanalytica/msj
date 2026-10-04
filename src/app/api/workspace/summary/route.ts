import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: membership } = await supabase
    .from("workspace_member")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({
      workspace: null,
      plan: "starter",
      usage: { active_contacts: 0, ai_replies: 0, inbound_messages: 0, outbound_messages: 0 },
      channels: 0,
      integrations: 0,
    });
  }

  const workspaceId = membership.workspace_id;
  const month = new Date().toISOString().slice(0, 7) + "-01";

  const [workspaceRes, subRes, usageRes, channelsRes, integrationsRes] = await Promise.all([
    supabase.from("workspace").select("id,name,slug,status").eq("id", workspaceId).single(),
    supabase.from("workspace_subscription").select("plan_code,status").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("usage_monthly").select("*").eq("workspace_id", workspaceId).eq("month", month).maybeSingle(),
    supabase.from("channel_connection").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
    supabase.from("integration").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("enabled", true),
  ]);

  return NextResponse.json({
    workspace: workspaceRes.data ?? null,
    plan: subRes.data?.plan_code ?? "starter",
    subscriptionStatus: subRes.data?.status ?? "trialing",
    usage: usageRes.data ?? { active_contacts: 0, ai_replies: 0, inbound_messages: 0, outbound_messages: 0 },
    channels: channelsRes.count ?? 0,
    integrations: integrationsRes.count ?? 0,
  });
}
