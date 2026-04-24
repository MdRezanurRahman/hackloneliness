import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { LyannaFab } from "@/components/lyanna-fab";
import type { PostWithAuthor, ActivityWithHost } from "@/lib/types/social";
import { ACTIVITY_CATEGORIES } from "@/lib/types/social";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  // Upcoming activities (next 7 days, not full/cancelled)
  const { data: activitiesRaw } = await supabase
    .from("activities")
    .select("*, host:host_id(id, display_name, avatar_url, reputation_score)")
    .eq("status", "open")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(5);
  const activities = (activitiesRaw ?? []) as unknown as ActivityWithHost[];

  // Recent posts feed
  const { data: postsRaw } = await supabase
    .from("posts")
    .select("*, author:user_id(id, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(20);
  const posts = (postsRaw ?? []) as unknown as PostWithAuthor[];

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white pb-24">
      <header className="sticky top-0 z-20 px-5 py-4 border-b border-white/5 bg-slate-950/70 backdrop-blur-md flex items-center justify-between">
        <div>
          <p className="text-violet-300 text-xs">Welcome back</p>
          <h1 className="text-xl font-semibold">Hey {profile.display_name} 👋</h1>
        </div>
        <Link
          href="/activities/new"
          className="text-sm bg-white/10 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/15 transition-colors"
        >
          + Host
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
        {/* Upcoming activities */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Happening soon</h2>
            <Link href="/activities" className="text-sm text-violet-300 hover:text-violet-200">
              See all →
            </Link>
          </div>
          {activities.length === 0 ? (
            <EmptyCard
              title="No upcoming meetups yet"
              body="Be the first to host something nearby."
              cta={{ href: "/activities/new", label: "Host a meetup" }}
            />
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2 snap-x">
              {activities.map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </div>
          )}
        </section>

        {/* Posts feed */}
        <section>
          <h2 className="font-semibold text-lg mb-3">Your community</h2>
          {posts.length === 0 ? (
            <EmptyCard
              title="No posts yet"
              body="Share a moment to start the feed."
              cta={{ href: "/posts/new", label: "Share a photo" }}
            />
          ) : (
            <div className="space-y-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </section>
      </div>

      <LyannaFab />
      <BottomNav />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────
function ActivityCard({ activity }: { activity: ActivityWithHost }) {
  const cat = ACTIVITY_CATEGORIES.find((c) => c.value === activity.category);
  const start = new Date(activity.starts_at);
  const timeLabel = start.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="snap-start shrink-0 w-64 bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-colors"
    >
      <div className="text-2xl mb-2">{cat?.icon ?? "✨"}</div>
      <h3 className="font-semibold text-white line-clamp-2 leading-snug mb-1">
        {activity.title}
      </h3>
      <p className="text-white/50 text-xs mb-3">{timeLabel} · {activity.city ?? "Nearby"}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">
          {activity.current_count}/{activity.max_attendees} joined
        </span>
        <span className="text-violet-300">
          by {activity.host?.display_name ?? "someone"}
        </span>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: PostWithAuthor }) {
  return (
    <article className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <Link href={`/profile/${post.author.id}`} className="flex items-center gap-2 p-3">
        <Avatar name={post.author.display_name} url={post.author.avatar_url} />
        <span className="text-sm font-medium">{post.author.display_name}</span>
      </Link>
      <div className="relative bg-black aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image_url} alt={post.caption ?? ""} className="w-full h-full object-cover" />
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs text-white/60">{post.like_count} likes · {post.comment_count} comments</p>
        {post.caption && (
          <p className="text-sm">
            <span className="font-medium">{post.author.display_name}</span>{" "}
            <span className="text-white/80">{post.caption}</span>
          </p>
        )}
      </div>
    </article>
  );
}

function Avatar({ name, url, size = "sm" }: { name: string; url: string | null; size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? "w-8 h-8 text-xs" : size === "md" ? "w-12 h-12 text-sm" : "w-20 h-20 text-lg";
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

function EmptyCard({ title, body, cta }: { title: string; body: string; cta: { href: string; label: string } }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
      <p className="font-medium text-white mb-1">{title}</p>
      <p className="text-white/50 text-sm mb-4">{body}</p>
      <Link
        href={cta.href}
        className="inline-block px-4 py-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-sm font-semibold"
      >
        {cta.label}
      </Link>
    </div>
  );
}
