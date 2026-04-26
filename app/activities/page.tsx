import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { LyannaFab } from "@/components/lyanna-fab";
import type { ActivityWithHost } from "@/lib/types/social";
import { ACTIVITY_CATEGORIES } from "@/lib/types/social";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: raw } = await supabase
    .from("activities")
    .select("*, host:host_id(id, display_name, avatar_url, reputation_score)")
    .in("status", ["open"])
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const activities = (raw ?? []) as unknown as ActivityWithHost[];

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-24">
      <header className="sticky top-0 z-20 px-5 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-md flex items-center justify-between">
        <h1 className="font-semibold text-lg">Activities</h1>
        <Link
          href="/activities/new"
          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-sm font-semibold"
        >
          + Host
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-5 space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">✨</div>
            <p className="font-medium mb-1">Nothing nearby yet</p>
            <p className="text-slate-900/50 text-sm mb-5">Be the first to host something.</p>
            <Link
              href="/activities/new"
              className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 font-semibold"
            >
              Host a meetup
            </Link>
          </div>
        ) : (
          activities.map((a) => <ActivityRow key={a.id} activity={a} />)
        )}
      </div>

      <LyannaFab />
      <BottomNav />
    </main>
  );
}

function ActivityRow({ activity }: { activity: ActivityWithHost }) {
  const cat = ACTIVITY_CATEGORIES.find((c) => c.value === activity.category);
  const start = new Date(activity.starts_at);
  const now = Date.now();
  const mins = Math.round((start.getTime() - now) / 60000);
  const when =
    mins < 60
      ? `in ${Math.max(mins, 0)} min`
      : mins < 1440
      ? `in ${Math.round(mins / 60)}h`
      : start.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:bg-slate-100 transition-colors"
    >
      <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-violet-400/30 flex items-center justify-center text-2xl">
        {cat?.icon ?? "✨"}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{activity.title}</h3>
        <p className="text-slate-900/50 text-xs">{when} · {activity.city ?? "Nearby"}</p>
        <p className="text-violet-600/80 text-xs mt-0.5">
          {activity.current_count}/{activity.max_attendees} joined ·
          hosted by {activity.host?.display_name ?? "someone"}
        </p>
      </div>
      <span className="text-slate-900/30">→</span>
    </Link>
  );
}
