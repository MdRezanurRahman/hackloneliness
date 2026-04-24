"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Join / leave ───────────────────────────────────────────────────────

export function JoinButton({
  activityId,
  isJoined,
  isFull,
}: {
  activityId: string;
  isJoined: boolean;
  isFull: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(isJoined);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      if (joined) {
        const { error } = await supabase
          .from("activity_attendees")
          .delete()
          .eq("activity_id", activityId)
          .eq("user_id", user.id);
        if (error) throw error;
        setJoined(false);
      } else {
        const { error } = await supabase.from("activity_attendees").insert({
          activity_id: activityId,
          user_id: user.id,
          status: "confirmed",
        });
        if (error) throw error;
        setJoined(true);
      }
      router.refresh();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Something went wrong";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!joined && isFull) {
    return (
      <button disabled className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/40">
        This meetup is full
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={toggle}
        disabled={busy}
        className={`w-full py-3.5 rounded-xl font-semibold transition-opacity disabled:opacity-50 ${
          joined
            ? "bg-white/10 border border-white/10 hover:bg-white/15"
            : "bg-gradient-to-r from-violet-500 to-indigo-500"
        }`}
      >
        {busy ? "…" : joined ? "You're in — tap to leave" : "Join this meetup"}
      </button>
      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Host QR code panel ─────────────────────────────────────────────────

export function HostQrPanel({ activityId }: { activityId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Generate a random token (32 hex chars)
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const tok = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase.from("verification_logs").insert({
        activity_id: activityId,
        initiator_id: user.id,
        qr_token: tok,
        status: "pending",
      });
      if (error) throw error;
      setToken(tok);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Could not create QR";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Load active token on mount (if any)
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("verification_logs")
        .select("qr_token, token_expires_at, status")
        .eq("activity_id", activityId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && new Date(data.token_expires_at) > new Date()) {
        setToken(data.qr_token);
      }
    })();
  }, [activityId]);

  const verifyUrl = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${token}` : "";
  const qrImg = token
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(verifyUrl)}&size=280x280&bgcolor=0f172a&color=ffffff&margin=20`
    : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-sm font-medium mb-1">You&apos;re the host</p>
      <p className="text-white/50 text-xs mb-4">
        Show this QR when attendees arrive — they scan to check in.
      </p>

      {qrImg ? (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImg} alt="Activity QR" className="w-60 h-60" />
          </div>
          <p className="text-xs text-white/40 text-center break-all px-4">
            {verifyUrl}
          </p>
          <button
            onClick={() => setToken(null)}
            className="text-xs text-violet-300 hover:text-violet-200"
          >
            Rotate QR code
          </button>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 font-semibold disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate check-in QR"}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
