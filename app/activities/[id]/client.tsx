"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AttendeeStatus, AttendeeWithUser } from "@/lib/types/social";

// ═════════════════════════════════════════════════════════════════════
// ATTENDEE-SIDE: request flow
// ═════════════════════════════════════════════════════════════════════

export function AttendeeRequestPanel({
  activityId,
  hostId,
  myStatus,
  locationRevealed,
  isFull,
}: {
  activityId: string;
  hostId: string;
  myStatus: AttendeeStatus;
  locationRevealed: boolean;
  isFull: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [introMsg, setIntroMsg] = useState("");

  const sendRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("activity_attendees").insert({
        activity_id: activityId,
        user_id: user.id,
        status: "pending",
        requested_message: introMsg.trim() || null,
      });
      if (error) throw error;
      setIntroOpen(false);
      router.refresh();
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!confirm("Withdraw your request?")) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("activity_attendees")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", user.id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const messageHost = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const id = await ensureConversation(supabase, user.id, hostId);
      router.push(`/messages/${id}`);
    } catch (err) {
      setError(extractMessage(err));
      setBusy(false);
    }
  };

  // ── Render by status ────────────────────────────────────────────────

  if (myStatus === "rejected") {
    return (
      <Card>
        <p className="font-medium">Request declined</p>
        <p className="text-slate-900/50 text-sm mt-1">
          The host wasn&apos;t able to take you on this one. Try another nearby meetup.
        </p>
      </Card>
    );
  }

  if (myStatus === "approved" || myStatus === "confirmed") {
    return (
      <div className="space-y-3">
        <Card border="violet">
          <p className="text-xs text-violet-600 mb-1">✓ You&apos;re in</p>
          <p className="font-medium">
            {locationRevealed
              ? "Meeting spot is unlocked above"
              : "Awaiting location reveal"}
          </p>
          <p className="text-slate-900/60 text-sm mt-1">
            {locationRevealed
              ? "Head to the spot at the start time. Your host will show a QR for you to check in."
              : "Chat with the host to lock in details. They'll share the exact meeting spot when ready."}
          </p>
        </Card>

        <button
          onClick={messageHost}
          disabled={busy}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 font-semibold disabled:opacity-50"
        >
          {busy ? "…" : "Message host"}
        </button>

        {locationRevealed && (
          <CheckInScanner activityId={activityId} />
        )}

        {error && <ErrorBox msg={error} />}
      </div>
    );
  }

  if (myStatus === "pending") {
    return (
      <div className="space-y-3">
        <Card border="violet">
          <p className="text-xs text-violet-600 mb-1">⏳ Request sent</p>
          <p className="font-medium">Awaiting host approval</p>
          <p className="text-slate-900/60 text-sm mt-1">
            Once they approve, you&apos;ll be able to message them and the meeting
            spot will be revealed.
          </p>
        </Card>
        <button
          onClick={cancelRequest}
          disabled={busy}
          className="w-full py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900/70 text-sm hover:bg-slate-100 disabled:opacity-50"
        >
          Withdraw request
        </button>
        {error && <ErrorBox msg={error} />}
      </div>
    );
  }

  // myStatus === 'none' (or 'cancelled' / 'no_show')
  if (isFull) {
    return (
      <Card>
        <p className="font-medium">This meetup is full</p>
        <p className="text-slate-900/50 text-sm mt-1">
          Find another nearby Echo on the home feed.
        </p>
      </Card>
    );
  }

  if (introOpen) {
    return (
      <div className="space-y-3">
        <textarea
          value={introMsg}
          onChange={(e) => setIntroMsg(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="Optional — say hi, share why you're interested. The host sees this when reviewing your request."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:border-violet-400/50"
        />
        <p className="text-xs text-slate-900/30 text-right -mt-2">{introMsg.length}/280</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIntroOpen(false)}
            disabled={busy}
            className="py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={sendRequest}
            disabled={busy}
            className="py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 font-semibold disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
        {error && <ErrorBox msg={error} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIntroOpen(true)}
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 font-semibold disabled:opacity-50"
      >
        Request to join
      </button>
      <p className="text-center text-slate-900/40 text-xs">
        Hosts review every request. The exact meeting spot is revealed only after approval.
      </p>
      {error && <ErrorBox msg={error} />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// HOST-SIDE: manage requests + reveal location + QR
// ═════════════════════════════════════════════════════════════════════

export function HostManagePanel({
  activityId,
  attendees,
  isFull,
}: {
  activityId: string;
  attendees: AttendeeWithUser[];
  isFull: boolean;
}) {
  const pending = attendees.filter((a) => a.status === "pending");
  const approved = attendees.filter(
    (a) => a.status === "approved" || a.status === "confirmed",
  );

  const anyRevealed = approved.some((a) => a.location_revealed_at != null);

  return (
    <div className="space-y-5">
      {/* Pending requests */}
      <section>
        <h3 className="font-semibold text-sm mb-2">
          Join requests
          <span className="ml-2 text-slate-900/40 text-xs">{pending.length}</span>
        </h3>
        {pending.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-900/50">No pending requests yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((a) => (
              <PendingRequestCard
                key={a.user_id}
                activityId={activityId}
                attendee={a}
                isFull={isFull}
              />
            ))}
          </div>
        )}
      </section>

      {/* Approved attendees */}
      <section>
        <h3 className="font-semibold text-sm mb-2">
          Approved
          <span className="ml-2 text-slate-900/40 text-xs">{approved.length}</span>
        </h3>
        {approved.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-900/50">No approved attendees yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {approved.map((a) => (
              <ApprovedAttendeeCard
                key={a.user_id}
                activityId={activityId}
                attendee={a}
              />
            ))}
          </div>
        )}
      </section>

      {/* QR check-in panel — only relevant once a location is revealed */}
      {anyRevealed && <HostQrPanel activityId={activityId} />}
    </div>
  );
}

// ─── Pending request card (Approve / Reject) ─────────────────────────

function PendingRequestCard({
  activityId,
  attendee,
  isFull,
}: {
  activityId: string;
  attendee: AttendeeWithUser;
  isFull: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = async (next: "approved" | "rejected") => {
    setBusy(next === "approved" ? "approve" : "reject");
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("activity_attendees")
        .update({ status: next })
        .eq("activity_id", activityId)
        .eq("user_id", attendee.user_id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const u = attendee.user;
  const ai = u.ai_profile as Record<string, unknown> | undefined;
  const studyOrJob = (ai?.education as string) || (ai?.occupation as string);

  return (
    <Card>
      <Link href={`/profile/${u.id}`} className="flex items-center gap-3">
        <Avatar name={u.display_name} url={u.avatar_url} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {u.full_name || u.display_name}
          </p>
          {studyOrJob && (
            <p className="text-xs text-slate-900/50 truncate">{studyOrJob}</p>
          )}
          <p className="text-[11px] text-violet-600/80">
            ⭐ {u.reputation_score?.toFixed(1) ?? "5.0"} · tap for full profile
          </p>
        </div>
        <span className="text-slate-900/30">→</span>
      </Link>

      {attendee.requested_message && (
        <div className="mt-3 p-3 bg-black/30 rounded-xl border border-slate-100">
          <p className="text-[11px] text-slate-900/40 mb-1">Their note</p>
          <p className="text-sm text-slate-900/80 italic whitespace-pre-wrap">
            “{attendee.requested_message}”
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => update("rejected")}
          disabled={busy !== null}
          className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          {busy === "reject" ? "…" : "Decline"}
        </button>
        <button
          onClick={() => update("approved")}
          disabled={busy !== null || isFull}
          title={isFull ? "Meetup is full" : ""}
          className="py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-semibold disabled:opacity-40"
        >
          {busy === "approve" ? "…" : "Approve"}
        </button>
      </div>
      {error && <ErrorBox msg={error} />}
    </Card>
  );
}

// ─── Approved attendee card (Reveal location / Message) ──────────────

function ApprovedAttendeeCard({
  activityId,
  attendee,
}: {
  activityId: string;
  attendee: AttendeeWithUser;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revealed = attendee.location_revealed_at != null;

  const reveal = async () => {
    if (!confirm(`Reveal the meeting spot to ${attendee.user.display_name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("activity_attendees")
        .update({ location_revealed_at: new Date().toISOString() })
        .eq("activity_id", activityId)
        .eq("user_id", attendee.user_id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const messageThem = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const id = await ensureConversation(supabase, user.id, attendee.user_id);
      router.push(`/messages/${id}`);
    } catch (err) {
      setError(extractMessage(err));
      setBusy(false);
    }
  };

  return (
    <Card>
      <Link href={`/profile/${attendee.user.id}`} className="flex items-center gap-3">
        <Avatar name={attendee.user.display_name} url={attendee.user.avatar_url} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {attendee.user.full_name || attendee.user.display_name}
          </p>
          <p className="text-[11px] text-violet-600/80">
            {revealed ? "📍 Location revealed" : "Awaiting location reveal"}
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={messageThem}
          disabled={busy}
          className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          {busy ? "…" : "Message"}
        </button>
        {revealed ? (
          <span className="py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm font-medium text-violet-600 text-center">
            ✓ Revealed
          </span>
        ) : (
          <button
            onClick={reveal}
            disabled={busy}
            className="py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "…" : "Reveal location"}
          </button>
        )}
      </div>
      {error && <ErrorBox msg={error} />}
    </Card>
  );
}

// ─── QR panel for the host (one QR for the activity) ─────────────────

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
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  };

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

  const verifyUrl =
    token
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${token}`
      : "";
  const qrImg =
    token
      ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(verifyUrl)}&size=280x280&bgcolor=0f172a&color=ffffff&margin=20`
      : null;

  return (
    <Card>
      <p className="text-sm font-medium mb-1">Check-in QR</p>
      <p className="text-slate-900/50 text-xs mb-4">
        Show this when approved attendees arrive — they scan to check in.
      </p>

      {qrImg ? (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImg} alt="Activity QR" className="w-60 h-60" />
          </div>
          <button
            onClick={() => setToken(null)}
            className="text-xs text-violet-600 hover:text-violet-700"
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
      {error && <ErrorBox msg={error} />}
    </Card>
  );
}

// ─── Attendee-side: "Open camera" hint for the QR ────────────────────

function CheckInScanner({ activityId: _activityId }: { activityId: string }) {
  return (
    <Card>
      <p className="text-sm font-medium">Ready to check in</p>
      <p className="text-slate-900/50 text-xs mt-1">
        When you arrive, ask the host to show their QR. Scan it with your phone&apos;s
        camera and you&apos;ll be checked in automatically.
      </p>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═════════════════════════════════════════════════════════════════════

function Card({
  children,
  border = "default",
}: {
  children: React.ReactNode;
  border?: "default" | "violet";
}) {
  const cls =
    border === "violet"
      ? "bg-gradient-to-br from-violet-500/15 to-indigo-500/10 border-violet-400/30"
      : "bg-slate-50 border-slate-200";
  return <div className={`${cls} border rounded-2xl p-4`}>{children}</div>;
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
      {msg}
    </p>
  );
}

function Avatar({
  name,
  url,
  size = "sm",
}: {
  name: string;
  url: string | null;
  size?: "sm" | "md";
}) {
  const px = size === "md" ? "w-12 h-12 text-sm" : "w-6 h-6 text-xs";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${px} rounded-full object-cover`} />;
  }
  return (
    <div
      className={`${px} rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-semibold`}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function extractMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Something went wrong";
}

// Find or create the 1:1 conversation between two users.
// Calls the server-side start_conversation RPC (migration 007), which
// runs as SECURITY DEFINER so the conversation + both participant rows
// land atomically without the policy gymnastics that broke the manual
// two-step version.
async function ensureConversation(
  supabase: ReturnType<typeof createClient>,
  _meId: string,    // kept for call-site signature compatibility
  otherId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("start_conversation", {
    other_user_id: otherId,
  });
  if (error) throw error;
  if (!data) throw new Error("No conversation id returned");
  return data as string;
}
