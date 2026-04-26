import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { LyannaFab } from "@/components/lyanna-fab";
import { ProfileDrawer } from "@/components/profile-drawer";
import { ProfileActions } from "./actions";
import { MeetupsRow, type MeetupRow } from "./meetups";
import { EchoesSection, type EchoTile } from "./echoes";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();
  if (!me) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, display_name, full_name, bio, avatar_url, age, reputation_score, safety_score, verified_id, ai_profile")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, post_type, image_url, video_url, caption, like_count, comment_count")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const isMe = me.id === id;
  const postCount = posts?.length ?? 0;
  const nowIso = new Date().toISOString();

  const meetupSelect =
    "id, title, category, city, address_label, starts_at, duration_mins, current_count, max_attendees, is_public, status";

  // Past hosted events. Owner sees all; visitors see only is_public = true.
  let pastQuery = supabase
    .from("activities")
    .select(meetupSelect)
    .eq("host_id", id)
    .lt("starts_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(20);
  if (!isMe) pastQuery = pastQuery.eq("is_public", true);
  const { data: pastEventsRaw } = await pastQuery;
  const pastEvents = (pastEventsRaw ?? []) as MeetupRow[];

  // Upcoming hosted events. Public for visitors, all for owner.
  let upcomingQuery = supabase
    .from("activities")
    .select(meetupSelect)
    .eq("host_id", id)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(20);
  if (!isMe) upcomingQuery = upcomingQuery.eq("is_public", true);
  const { data: upcomingEventsRaw } = await upcomingQuery;
  const upcomingEvents = (upcomingEventsRaw ?? []) as MeetupRow[];

  return (
    <main className="min-h-screen bg-white dark:bg-black dark:bg-black text-slate-900 dark:text-white pb-24">
      <header className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900">
        <Link href="/home" className="text-slate-900/60 dark:text-white/60 text-sm">← Back</Link>
        <h1 className="font-semibold text-center truncate px-2">{profile.display_name}</h1>
        {isMe ? <ProfileDrawer /> : <div className="w-10" />}
      </header>

      {/* ─── Identity block ──────────────────────────────────────── */}
      <div className="max-w-md mx-auto px-5 pt-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile.display_name} url={profile.avatar_url} size="lg" />
          <div className="flex-1 grid grid-cols-3 text-center">
            <Stat value={postCount} label="echoes" />
            <Stat value={profile.reputation_score?.toFixed(1) ?? "5.0"} label="rep" />
            <Stat value={profile.safety_score?.toFixed(1) ?? "5.0"} label="safety" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">
              {profile.full_name || profile.display_name}
              {profile.age ? <span className="text-slate-900/50 dark:text-white/50 font-normal">, {profile.age}</span> : null}
            </h2>
            {profile.verified_id && (
              <span className="text-xs bg-violet-500/20 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                Verified
              </span>
            )}
          </div>
          {profile.bio && <p className="text-slate-900/70 dark:text-white/70 text-sm mt-1 whitespace-pre-wrap">{profile.bio}</p>}

          {/* Education / occupation */}
          <div className="mt-3 space-y-1 text-sm text-slate-900/70 dark:text-white/70">
            {profile.ai_profile?.education && (
              <p>🎓 {profile.ai_profile.education as string}</p>
            )}
            {profile.ai_profile?.occupation && (
              <p>💼 {profile.ai_profile.occupation as string}</p>
            )}
          </div>

          {/* Weekend vibe chips */}
          {(() => {
            const weekend = (profile.ai_profile?.ideal_weekend as string[] | undefined) ?? [];
            const legacy  = (profile.ai_profile?.goals         as string[] | undefined) ?? [];
            const tags    = weekend.length ? weekend : legacy;
            if (!tags.length) return null;
            return (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.slice(0, 5).map((t) => (
                  <span key={t} className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-900/70 dark:text-white/70 capitalize">
                    {t.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Visitor-only action bar (owner uses the drawer instead) */}
        {!isMe && (
          <div className="mt-5">
            <ProfileActions profileId={id} isMe={isMe} />
          </div>
        )}
      </div>

      {/* ─── Meetups: Upcoming + Past, side-by-side ────────────── */}
      <div className="max-w-md mx-auto mt-6 border-t border-slate-200 dark:border-slate-800">
        <MeetupsRow upcoming={upcomingEvents} past={pastEvents} isOwner={isMe} />
      </div>

      {/* ─── Echoes (separate section below the meetups row) ───── */}
      <div className="max-w-md mx-auto border-t border-slate-200 dark:border-slate-800">
        <EchoesSection posts={(posts ?? []) as EchoTile[]} isOwner={isMe} />
      </div>

      <LyannaFab />
      <BottomNav />
    </main>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-slate-900/50 dark:text-white/50 text-xs">{label}</div>
    </div>
  );
}

function Avatar({ name, url, size = "sm" }: { name: string; url: string | null; size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? "w-8 h-8 text-xs" : size === "md" ? "w-12 h-12 text-sm" : "w-20 h-20 text-2xl";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${px} rounded-full object-cover`} />;
  }
  return (
    <div className={`${px} rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-semibold`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
