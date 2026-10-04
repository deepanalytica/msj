import { redirect } from "next/navigation";
import { PlatformControl } from "@/components/PlatformControl";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

export default async function ControlPage() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data } = await admin.from("platform_admin").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) redirect("/app");

  return <PlatformControl />;
}
