"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function ProfileActions({ profileId, isMe }: { profileId: string; isMe: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const signOut = async () => {
    const confirmed = confirm("Sign out of hackloneliness?");
    if (!confirmed) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (isMe) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/profile/edit"
            className="py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-medium text-center hover:bg-white/15"
          >
            Edit profile
          </Link>
          <Link
            href="/echoes/new"
            className="py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-sm font-semibold text-center"
          >
            New echo
          </Link>
        </div>
        <button
          onClick={signOut}
          className="w-full py-2 text-xs text-white/40 hover:text-red-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  const startConversation = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("start_conversation", {
        other_user_id: profileId,
      });
      if (error) throw error;
      if (!data) throw new Error("No conversation id returned");
      router.push(`/messages/${data}`);
    } catch (err) {
      console.error(err);
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not open chat";
      alert(msg);
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={startConversation}
        disabled={loading}
        className="py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Opening…" : "Message"}
      </button>
      <Link
        href="/activities"
        className="py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-medium text-center hover:bg-white/15"
      >
        Activities
      </Link>
    </div>
  );
}
