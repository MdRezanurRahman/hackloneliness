import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { ACTIVITY_CATEGORIES } from "@/lib/types/social";
import type { AttendeeWithUser, AttendeeStatus } from "@/lib/types/social";
import {
  AttendeeRequestPanel,
  HostManagePanel,
} from "./client";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: a } = await supabase
    .from("activities")
    .select(
      "*, host:host_id(id, display_name, full_name, avatar_url, reputation_score, ai_profile)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();

  const isHost = a.host_id === user.id;

  // What's MY relationship to this activity?
  const { data: myAttendance } = await supabase
    .from("activity_attendees")
    .select("status, location_revealed_at, requested_message")
    .eq("activity_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myStatus: AttendeeStatus = (myAttendance?.status as AttendeeStatus) ?? "none";
  const locationRevealedToMe =
    isHost ||
    ((myStatus === "approved" || myStatus === "confirmed") &&
      myAttendance?.location_revealed_at != null);

  // If I'm the host, fetch every attendee so I can manage them
  let allAttendees: AttendeeWithUser[] = [];
  if (isHost) {
    const { data } = await supabase
      .from("activity_attendees")
      .select(
        "user_id, status, location_revealed_at, requested_message, joined_at, " +
          "user:user_id(id, display_name, full_name, avatar_url, reputation_score, ai_profile)",
      )
      .eq("activity_id", id)
      .order("joined_at", { ascending: false });
    allAttendees = (data ?? []) as unknown as AttendeeWithUser[];
  }

  // Public-facing approved attendees (everyone sees who's confirmed coming)
  const { data: publicAttendeesRaw } = await supabase
    .from("activity_attendees")
    .select(
      "user_id, status, user:user_id(id, display_name, avatar_url)",
    )
    .eq("activity_id", id)
    .in("status", ["approved", "confirmed"]);
  const publicAttendees =
    (publicAttendeesRaw ?? []) as unknown as {
      user_id: string;
      status: string;
      user: { id: string; display_name: string; avatar_url: string | null };
    }[];

  const cat = ACTIVITY_CATEGORIES.find((c) => c.value === a.category);
  const start = new Date(a.starts_at);

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-28">
      <header className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <Link href="/activities" className="text-slate-900/60 text-sm">
          ← Back
        </Link>
        <h1 className="font-semibold">Meetup</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-5">
        {/* ── Big title + category ────────────────────────────── */}
        <div>
          <div className="text-4xl mb-3">{cat?.icon ?? "✨"}</div>
          <h2 className="text-2xl font-semibold">{a.title}</h2>
          <p className="text-slate-900/50 text-sm mt-1 capitalize">{a.category}</p>
        </div>

        {/* ── Host card (always visible — attendees can vet host) ── */}
        <Link
          href={`/profile/${a.host_id}`}
          className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 hover:bg-slate-100 transition-colors"
        >
          <Avatar name={a.host?.display_name ?? "Host"} url={a.host?.avatar_url ?? null} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-900/50">Hosted by</p>
            <p className="font-semibold truncate">{a.host?.display_name ?? "—"}</p>
            <p className="text-xs text-violet-600/80">
              ⭐ {a.host?.reputation_score?.toFixed(1) ?? "5.0"} · tap to view profile
            </p>
          </div>
          <span className="text-slate-900/30">→</span>
        </Link>

        {/* ── What & when (always visible) ────────────────────── */}
        <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <InfoRow icon="🕐" label="When" value={start.toLocaleString(undefined, {
            weekday: "short", month: "short", day: "numeric",
            hour: "numeric", minute: "2-digit",
          })} />
          <InfoRow icon="⏱" label="Duration" value={`${a.duration_mins} min`} />
          <InfoRow icon="👥" label="Attendees" value={`${a.current_count}/${a.max_attendees}`} />
          {a.city && <InfoRow icon="🏙" label="Area" value={a.city} />}

          {/* Location row: gated */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-lg">📍</span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900/40 text-xs">Meeting spot</p>
              {locationRevealedToMe && a.address_label ? (
                <p className="text-sm">{a.address_label}</p>
              ) : (
                <p className="text-sm text-slate-900/40 italic">
                  Hidden until {isHost ? "you reveal it" : "the host reveals it"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Description ─────────────────────────────────────── */}
        {a.description && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-900/50 mb-1.5">Details</p>
            <p className="text-sm text-slate-900/90 whitespace-pre-wrap">{a.description}</p>
          </div>
        )}

        {/* ── Who's coming (public, only approved+) ──────────── */}
        {publicAttendees.length > 0 && (
          <div>
            <p className="text-xs text-slate-900/50 mb-2">Who&apos;s coming</p>
            <div className="flex flex-wrap gap-2">
              {publicAttendees.map((att) => (
                <Link
                  key={att.user_id}
                  href={`/profile/${att.user.id}`}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-1 pr-3 py-1"
                >
                  <Avatar name={att.user.display_name} url={att.user.avatar_url} />
                  <span className="text-xs">{att.user.display_name}</span>
                  {att.user.id === a.host_id && (
                    <span className="text-[10px] text-violet-600">host</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Action panels ───────────────────────────────────── */}
        {isHost ? (
          <HostManagePanel
            activityId={a.id}
            attendees={allAttendees}
            isFull={a.current_count >= a.max_attendees}
          />
        ) : (
          <AttendeeRequestPanel
            activityId={a.id}
            hostId={a.host_id}
            myStatus={myStatus}
            locationRevealed={locationRevealedToMe}
            isFull={a.current_count >= a.max_attendees}
          />
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-slate-900/40 text-xs">{label}</p>
        <p className="text-sm truncate">{value}</p>
      </div>
    </div>
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
  const px =
    size === "md"
      ? "w-12 h-12 text-sm"
      : "w-6 h-6 text-xs";
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
