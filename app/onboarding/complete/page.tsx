"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CompletePage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.display_name) setName(data.display_name);
    })();
  }, [router]);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Animated Lyanna badge */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 blur-2xl opacity-60 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-violet-500/50">
            L
          </div>
        </div>

        <p className="text-violet-600 dark:text-violet-400 text-sm font-medium mb-3">✨ Welcome to Lyanna</p>
        <h1 className="text-slate-900 dark:text-white text-3xl sm:text-4xl font-semibold mb-4 leading-tight">
          Hey {name || "there"} — I&apos;m so glad you&apos;re here.
        </h1>
        <p className="text-slate-900/60 dark:text-white/60 text-base sm:text-lg mb-10 leading-relaxed">
          I&apos;ll be with you the whole way. Tap the floating button anytime — before a meetup, after a rough day, or when you just need a friend.
        </p>

        <button
          onClick={() => router.push("/home")}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Let&apos;s go →
        </button>
      </div>
    </div>
  );
}
