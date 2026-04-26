"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
  primary?: boolean;
  /** When true, this tab shows the unread-message badge */
  showsBadge?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/activities", label: "Activities", icon: ActivityIcon },
  { href: "/echoes/new", label: "Echo", icon: PlusIcon, primary: true },
  { href: "/messages", label: "Chat", icon: ChatIcon, showsBadge: true },
  { href: "/profile/me", label: "Me", icon: UserIcon },
];

interface ToastData {
  id: string;
  conversationId: string;
  text: string;
  senderId: string;
}

export function BottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Use refs for values that change frequently — keeps the realtime
  // subscription effect mounted exactly once for the lifetime of the nav.
  const userIdRef   = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const refetchCount = async () => {
      const { data } = await supabase.rpc("unread_message_count");
      if (!cancelled && typeof data === "number") setUnreadCount(data);
    };

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      userIdRef.current = user.id;
      await refetchCount();
    };
    init();

    const channel = supabase
      .channel("nav-chat-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            text: string;
          };
          // Skip my own messages
          if (msg.sender_id === userIdRef.current) return;

          // If the user is currently viewing this thread, mark it read silently
          if (pathnameRef.current?.startsWith(`/messages/${msg.conversation_id}`)) {
            await supabase
              .from("conversation_participants")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", msg.conversation_id)
              .eq("user_id", userIdRef.current!);
            return;
          }

          // Otherwise: refetch count and show a toast
          refetchCount();
          setToast({
            id: msg.id,
            conversationId: msg.conversation_id,
            text: msg.text,
            senderId: msg.sender_id,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_participants" },
        () => refetchCount(), // last_read_at changed elsewhere → recount
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      {toast && <NewMessageToast data={toast} onClose={() => setToast(null)} />}

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/90 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto grid grid-cols-5 px-2 py-2">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));

            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 shadow-lg shadow-violet-500/40 flex items-center justify-center active:scale-95 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center py-1.5 transition-colors ${
                  active ? "text-white" : "text-white/40"
                }`}
              >
                <span className="relative">
                  <Icon className="w-6 h-6" />
                  {item.showsBadge && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-violet-500/40">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// ─── Toast: slides in from the top, dismisses itself after a few seconds ───
function NewMessageToast({
  data,
  onClose,
}: {
  data: ToastData;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose, data.id]);

  return (
    <Link
      href={`/messages/${data.conversationId}`}
      onClick={onClose}
      className="fixed top-3 right-3 left-3 sm:left-auto sm:right-6 sm:top-6 z-50 max-w-sm bg-slate-900/95 backdrop-blur border border-violet-400/40 rounded-2xl p-3 shadow-2xl shadow-violet-500/30 flex items-center gap-3 animate-toast-in"
    >
      <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-base">
        💬
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-violet-300 font-medium">New message</p>
        <p className="text-sm truncate text-white/90">{data.text}</p>
      </div>
      <span className="text-white/30">→</span>
    </Link>
  );
}

// ─── Icons (unchanged) ───────────────────────────────────────────────
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="10" r="3" strokeLinecap="round" />
      <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8}>
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4" strokeLinecap="round" />
      <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
    </svg>
  );
}
