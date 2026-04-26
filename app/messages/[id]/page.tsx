import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChatThread } from "./thread";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Confirm I'm a participant
  const { data: me } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) notFound();

  // Opening the thread = marking everything in it as read.
  // This UPDATE fires the bottom nav's realtime listener, which
  // refetches the unread count and clears the badge for this convo.
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id);

  // Other participant
  const { data: other } = await supabase
    .from("conversation_participants")
    .select("user:user_id(id, display_name, avatar_url)")
    .eq("conversation_id", id)
    .neq("user_id", user.id)
    .maybeSingle();

  const otherUser = other?.user as unknown as
    | { id: string; display_name: string; avatar_url: string | null }
    | null;

  // Initial messages
  const { data: initialMessages } = await supabase
    .from("messages")
    .select("id, created_at, sender_id, text")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <main className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white">
      <header className="px-4 py-3 flex items-center gap-3 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <Link href="/messages" className="text-white/60 hover:text-white">←</Link>
        {otherUser && (
          <Link href={`/profile/${otherUser.id}`} className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar name={otherUser.display_name} url={otherUser.avatar_url} />
            <span className="font-semibold truncate">{otherUser.display_name}</span>
          </Link>
        )}
      </header>

      <ChatThread
        conversationId={id}
        currentUserId={user.id}
        initialMessages={initialMessages ?? []}
      />
    </main>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
