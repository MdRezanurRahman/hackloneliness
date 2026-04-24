import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch conversations the current user is part of
  const { data: myConvos } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  const convoIds = (myConvos ?? []).map((c) => c.conversation_id);

  const conversations = convoIds.length
    ? (
        await supabase
          .from("conversations")
          .select("id, last_message_at, last_message_preview")
          .in("id", convoIds)
          .order("last_message_at", { ascending: false })
      ).data ?? []
    : [];

  // Find the other participant for each convo
  const otherParticipants = convoIds.length
    ? (
        await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id, user:user_id(id, display_name, avatar_url)")
          .in("conversation_id", convoIds)
          .neq("user_id", user.id)
      ).data ?? []
    : [];

  const otherByConvo = new Map(
    otherParticipants.map((p) => [p.conversation_id, p.user as unknown as { id: string; display_name: string; avatar_url: string | null }]),
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white pb-24">
      <header className="sticky top-0 z-20 px-5 py-4 border-b border-white/5 bg-slate-950/70 backdrop-blur-md">
        <h1 className="font-semibold text-lg">Messages</h1>
      </header>

      <div className="max-w-3xl mx-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="text-4xl mb-3">💬</div>
            <p className="font-medium">No messages yet</p>
            <p className="text-white/50 text-sm mt-1">
              Start a chat by tapping &ldquo;Message&rdquo; on someone&rsquo;s profile.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {conversations.map((c) => {
              const other = otherByConvo.get(c.id);
              if (!other) return null;
              return (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors"
                  >
                    <Avatar name={other.display_name} url={other.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{other.display_name}</p>
                        <p className="text-white/30 text-xs">{timeAgo(c.last_message_at)}</p>
                      </div>
                      <p className="text-white/50 text-sm truncate mt-0.5">
                        {c.last_message_preview ?? "Say hello…"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-12 h-12 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "now";
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h`;
  return `${Math.round(secs / 86400)}d`;
}
