import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

interface ConversationRow {
  conversation_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  other_user_id: string;
  other_display_name: string;
  other_avatar_url: string | null;
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rawConvos } = await supabase.rpc("my_conversations");
  // Hide conversations that don't have any messages yet — same model as
  // WhatsApp / Messenger: an empty chat shouldn't clutter the list.
  // start_conversation is idempotent, so re-tapping "Message" on the profile
  // takes them right back to the same (still-empty) conversation.
  const conversations = ((rawConvos ?? []) as ConversationRow[]).filter(
    (c) => c.last_message_preview != null && c.last_message_preview !== "",
  );

  return (
    <main className="min-h-screen bg-white dark:bg-black dark:bg-black text-slate-900 dark:text-white pb-24">
      <header className="sticky top-0 z-20 px-5 py-4 border-b border-slate-100 dark:border-slate-900 bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <h1 className="font-semibold text-lg">Messages</h1>
      </header>

      <div className="max-w-3xl mx-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="text-4xl mb-3">💬</div>
            <p className="font-medium">No messages yet</p>
            <p className="text-slate-900/50 dark:text-white/50 text-sm mt-1">
              Start a chat by tapping &ldquo;Message&rdquo; on someone&rsquo;s profile.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {conversations.map((c) => {
              const hasUnread = c.unread_count > 0;
              return (
                <li key={c.conversation_id}>
                  <Link
                    href={`/messages/${c.conversation_id}`}
                    className={`flex items-center gap-3 px-5 py-4 transition-colors ${
                      hasUnread ? "bg-violet-500/5 hover:bg-violet-100 dark:hover:bg-violet-900 dark:bg-violet-900" : "hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800"
                    }`}
                  >
                    <Avatar name={c.other_display_name} url={c.other_avatar_url} hasUnread={hasUnread} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate ${hasUnread ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-900/90 dark:text-white/90"}`}>
                          {c.other_display_name}
                        </p>
                        <p className="text-slate-900/30 dark:text-white/30 text-xs shrink-0">
                          {timeAgo(c.last_message_at)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p
                          className={`text-sm truncate ${
                            hasUnread
                              ? "text-slate-900 dark:text-white font-semibold"
                              : "text-slate-900/40 dark:text-white/40"
                          }`}
                        >
                          {c.last_message_preview}
                        </p>
                        {hasUnread && (
                          <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white text-[11px] font-bold flex items-center justify-center">
                            {c.unread_count > 99 ? "99+" : c.unread_count}
                          </span>
                        )}
                      </div>
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

function Avatar({
  name,
  url,
  hasUnread,
}: {
  name: string;
  url: string | null;
  hasUnread: boolean;
}) {
  const ring = hasUnread ? "ring-2 ring-violet-400/60" : "";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`w-12 h-12 rounded-full object-cover shrink-0 ${ring}`} />;
  }
  return (
    <div className={`w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-semibold ${ring}`}>
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
