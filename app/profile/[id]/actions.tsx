"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function ProfileActions({ profileId, isMe }: { profileId: string; isMe: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (isMe) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/profile/edit"
          className="py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-medium text-center hover:bg-white/15"
        >
          Edit profile
        </Link>
        <Link
          href="/posts/new"
          className="py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-sm font-semibold text-center"
        >
          New post
        </Link>
      </div>
    );
  }

  const startConversation = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Find existing 1:1 conversation by checking participants overlap
      const { data: mine } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const { data: theirs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", profileId);

      const mineIds = new Set((mine ?? []).map((r) => r.conversation_id));
      const shared = (theirs ?? []).find((r) => mineIds.has(r.conversation_id));

      let convoId: string | undefined = shared?.conversation_id;

      if (!convoId) {
        const { data: newConvo, error: cErr } = await supabase
          .from("conversations")
          .insert({})
          .select("id")
          .single();
        if (cErr) throw cErr;
        convoId = newConvo.id;

        const { error: pErr } = await supabase.from("conversation_participants").insert([
          { conversation_id: convoId, user_id: user.id },
          { conversation_id: convoId, user_id: profileId },
        ]);
        if (pErr) throw pErr;
      }

      router.push(`/messages/${convoId}`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not open chat");
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
