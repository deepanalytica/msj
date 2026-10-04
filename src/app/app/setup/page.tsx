import { redirect } from "next/navigation";
import { SetupConsole } from "@/components/SetupConsole";
import { createUserClient } from "@/lib/supabase/server";

export default async function SetupPage(){
  const supabase=await createUserClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  return <SetupConsole/>;
}
