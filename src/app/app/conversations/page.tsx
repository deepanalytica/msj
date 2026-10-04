import { redirect } from "next/navigation";
import { ConversationsConsole } from "@/components/ConversationsConsole";
import { createUserClient } from "@/lib/supabase/server";

export default async function ConversationsPage(){
  const supabase=await createUserClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  return <ConversationsConsole/>;
}
