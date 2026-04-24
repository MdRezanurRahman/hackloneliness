import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyProfileRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  redirect(`/profile/${user.id}`);
}
