import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { ACTIVITY_CATEGORIES } from "@/lib/types/social";
import { JoinButton, HostQrPanel } from "./client";

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
    .select("*, host:host_id(id, display_name, avatar_url, reputation_score)")
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();

  const { data: attendees } = await supabase
    .from("activity_attendees")
    .select("user_id, status, user:user_id(id, display_name, avatar_url)")
    .eq("activity_id", id);

  const isHost = user.id === a.host_id;
  const isJoined = (attendees ?? []).some(
    (r) => r.user_id === user.id && r.status === "confirmed",
  );

  const cat = ACTIVITY_CATEGORIES.find((c) => c.value === a.category);
  const start = new Date(a.starts_at);

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white pb-28">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <Link href="/activities" className="text-white/60 text-sm">← Back</Link>
        <h1 className="font-semibold">Meetup</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-5">
        <div>
          <div className="text-4xl mb-3">{cat?.icon ?? "✨"}</div>
          <h2 className="text-2xl font-semibold">{a.title}</h2>
          <p className="text-white/50 text-sm mt-1 capitalize">{a.category}</p>
        </div>

        <div className="space-y-2 bg-white/5 border border-white/10 rounded-2xl p-4">
          <InfoRow icon="🕐" label="When" value={start.toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })} />
          <InfoRow icon="⏱" label="Duration" value={`${a.duration_mins} min`} />
          {a.address_label && <InfoRow icon="📍" label="Meet at" value={a.address_label} />}
          {a.city && <InfoRow icon="🏙" label="City" value={a.city} />}
          <InfoRow
            icon="👥"
            label="Attendees"
            value={`${a.current_count}/${a.max_attendees}`}
          />
        </div>

        {a.description && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-white/50 mb-1.5">Details</p>
            <p className="text-sm text-white/90 whitespace-pre-wrap">{a.description}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-white/50 mb-2">Who&apos;s going</p>
          <div className="flex flex-wrap gap-2">
            {(attendees ?? [])
              .filter((att) => att.status === "confirmed")
              .map((att) => {
                const u = att.user as unknown as { id: string; display_name: string; avatar_url: string | null } | null;
                if (!u) return null;
                return (
                  <Link
                    key={u.id}
                    href={`/profile/${u.id}`}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-1 pr-3 py-1"
                  >
                    <Avatar name={u.display_name} url={u.avatar_url} />
                    <span className="text-xs">{u.display_name}</span>
                    {u.id === a.host_id && (
                      <span className="text-[10px] text-violet-300">host</span>
                    )}
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Action buttons */}
        {isHost ? (
          <HostQrPanel activityId={a.id} />
        ) : (
          <JoinButton
            activityId={a.id}
            isJoined={isJoined}
            isFull={a.current_count >= a.max_attendees}
          />
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white/40 text-xs">{label}</p>
        <p className="text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-6 h-6 rounded-full object-cover" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
