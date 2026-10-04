import { redirect } from "next/navigation";
import { AppConsole } from "@/components/AppConsole";
import { createUserClient } from "@/lib/supabase/server";

export default async function AppPage() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <AppConsole />;
}
