"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      onClick={logout}
      className="text-sm text-slate-900/60 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
    >
      Sign out
    </button>
  );
}
