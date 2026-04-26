"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ConfirmVerification({
  logId,
  activityId,
}: {
  logId: string;
  activityId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("verification_logs")
        .update({
          verifier_id: user.id,
          verified_at: new Date().toISOString(),
          status: "verified",
        })
        .eq("id", logId);
      if (error) throw error;
      setDone(true);
      setTimeout(() => {
        if (activityId) router.push(`/activities/${activityId}`);
        else router.push("/home");
      }, 1500);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Could not verify";
      setError(msg);
      setBusy(false);
    }
  };

  if (done) {
    return (
      <>
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-semibold mb-2">You&apos;re checked in</h1>
        <p className="text-slate-900/60 dark:text-white/60 text-sm">Have fun — this counts toward your reputation.</p>
      </>
    );
  }

  return (
    <>
      <div className="text-5xl mb-4">👋</div>
      <h1 className="text-2xl font-semibold mb-2">Confirm you&apos;re here</h1>
      <p className="text-slate-900/60 dark:text-white/60 text-sm mb-6">
        Tap below to check in to this meetup. The host will see you arrived.
      </p>
      <button
        onClick={confirm}
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 font-semibold disabled:opacity-50"
      >
        {busy ? "Checking in…" : "I&rsquo;m here — check me in"}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-3">
          {error}
        </p>
      )}
    </>
  );
}
