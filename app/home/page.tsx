import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { LyannaFab } from "@/components/lyanna-fab";
import { NearbyActivities } from "@/components/nearby-activities";
import type { PostWithAuthor } from "@/lib/types/social";

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

  // Recent echoes feed
  const { data: postsRaw } = await supabase
    .from("posts")
    .select("id, created_at, user_id, post_type, image_url, video_url, caption, like_count, comment_count, author:user_id(id, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(20);
  const posts = (postsRaw ?? []) as unknown as PostWithAuthor[];

  return (
    <main className="min-h-screen bg-white dark:bg-black dark:bg-black text-slate-900 dark:text-white pb-24">
      <header className="sticky top-0 z-20 px-5 py-4 border-b border-slate-100 dark:border-slate-900 bg-white/90 dark:bg-black/90 backdrop-blur-md flex items-center justify-between">
        <div>
          <p className="text-violet-600 dark:text-violet-400 text-xs">Welcome back</p>
          <h1 className="text-xl font-semibold">Hey {profile.display_name} 👋</h1>
        </div>
        <Link
          href="/activities/new"
          className="text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
        >
          + Host
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
        {/* Proximity-matched activities (client component — requests geolocation) */}
        <NearbyActivities />

        {/* Echoes feed */}
        <section>
          <h2 className="font-semibold text-lg mb-3">Echoes from your community</h2>
          {posts.length === 0 ? (
            <EmptyCard
              title="No echoes yet"
              body="Share a thought, photo, or clip to start the feed."
              cta={{ href: "/echoes/new", label: "Post an echo" }}
            />
          ) : (
            <div className="space-y-4">
              {posts.map((p) => (
                <EchoCard key={p.id} post={p} />
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
function EchoCard({ post }: { post: PostWithAuthor }) {
  return (
    <article className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      <Link href={`/profile/${post.author.id}`} className="flex items-center gap-2 p-3">
        <Avatar name={post.author.display_name} url={post.author.avatar_url} />
        <span className="text-sm font-medium">{post.author.display_name}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-900/30 dark:text-white/30">
          {post.post_type === "text" ? "Thought" : post.post_type === "image" ? "Photo" : "Clip"}
        </span>
      </Link>

      {/* Media or text body */}
      {post.post_type === "image" && post.image_url && (
        <div className="relative bg-black aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_url} alt={post.caption ?? ""} className="w-full h-full object-cover" />
        </div>
      )}

      {post.post_type === "video" && post.video_url && (
        <div className="relative bg-black aspect-video">
          <video
            src={post.video_url}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {post.post_type === "text" && (
        <div className="px-5 py-6 bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-transparent">
          <p className="text-[17px] leading-relaxed whitespace-pre-wrap break-words text-slate-900/90 dark:text-white/90">
            {post.caption}
          </p>
        </div>
      )}

      <div className="p-3 space-y-1">
        <p className="text-xs text-slate-900/60 dark:text-white/60">
          {post.like_count} likes · {post.comment_count} comments
        </p>
        {post.post_type !== "text" && post.caption && (
          <p className="text-sm">
            <span className="font-medium">{post.author.display_name}</span>{" "}
            <span className="text-slate-900/80 dark:text-white/80">{post.caption}</span>
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
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
      <p className="font-medium text-slate-900 dark:text-white mb-1">{title}</p>
      <p className="text-slate-900/50 dark:text-white/50 text-sm mb-4">{body}</p>
      <Link
        href={cta.href}
        className="inline-block px-4 py-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-sm font-semibold"
      >
        {cta.label}
      </Link>
    </div>
  );
}
