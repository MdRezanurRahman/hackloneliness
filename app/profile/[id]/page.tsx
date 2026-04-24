import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { LyannaFab } from "@/components/lyanna-fab";
import { ProfileActions } from "./actions";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();
  if (!me) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, display_name, bio, avatar_url, reputation_score, safety_score, verified_id, ai_profile")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, like_count, comment_count")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const isMe = me.id === id;
  const postCount = posts?.length ?? 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white pb-24">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <Link href="/home" className="text-white/60 text-sm">← Back</Link>
        <h1 className="font-semibold text-center">{profile.display_name}</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto px-5 pt-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile.display_name} url={profile.avatar_url} size="lg" />
          <div className="flex-1 grid grid-cols-3 text-center">
            <Stat value={postCount} label="posts" />
            <Stat value={profile.reputation_score?.toFixed(1) ?? "5.0"} label="rep" />
            <Stat value={profile.safety_score?.toFixed(1) ?? "5.0"} label="safety" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">{profile.display_name}</h2>
            {profile.verified_id && (
              <span className="text-xs bg-violet-500/20 text-violet-200 px-2 py-0.5 rounded-full">
                Verified
              </span>
            )}
          </div>
          {profile.bio && <p className="text-white/70 text-sm mt-1 whitespace-pre-wrap">{profile.bio}</p>}
          {profile.ai_profile?.goals?.length ? (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(profile.ai_profile.goals as string[]).slice(0, 5).map((g) => (
                <span key={g} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-full text-white/70">
                  {g.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <ProfileActions profileId={id} isMe={isMe} />
        </div>
      </div>

      <div className="max-w-md mx-auto mt-8 border-t border-white/10">
        {postCount === 0 ? (
          <div className="text-center py-12 text-white/40 text-sm">
            {isMe ? (
              <>
                No posts yet.{" "}
                <Link href="/posts/new" className="text-violet-300">
                  Share your first photo →
                </Link>
              </>
            ) : (
              "No posts yet."
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts!.map((post) => (
              <Link
                key={post.id}
                href={`/home`}
                className="relative aspect-square bg-black overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image_url} alt="" className="w-full h-full object-cover" />
              </Link>
            ))}
          </div>
        )}
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
      <div className="text-white/50 text-xs">{label}</div>
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
