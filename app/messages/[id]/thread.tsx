"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MessageRow } from "@/lib/types/social";

export function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Pick<MessageRow, "id" | "created_at" | "sender_id" | "text">[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Realtime subscription — new messages from other user
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`convo:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as MessageRow;
          setMessages((prev) => {
            // Dedup — don't add if we already rendered this from optimistic update
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });

          // If the incoming message is from the other user, advance my
          // last_read_at — I'm clearly viewing the thread right now.
          // The UPDATE fires the bottom nav listener so the badge clears.
          if (m.sender_id !== currentUserId) {
            supabase
              .from("conversation_participants")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", conversationId)
              .eq("user_id", currentUserId)
              .then(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const resizeTextarea = () => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    const supabase = createClient();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      created_at: new Date().toISOString(),
      conversation_id: conversationId,
      sender_id: currentUserId,
      text,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    requestAnimationFrame(resizeTextarea);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        text,
      })
      .select("id, created_at, sender_id, text")
      .single();

    if (error || !data) {
      // Revert optimistic
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert(error?.message ?? "Send failed");
    } else {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data, conversation_id: conversationId } : m)));
    }
    setSending(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide"
        style={{ overscrollBehavior: "contain" }}
      >
        {messages.length === 0 && (
          <div className="text-center text-slate-900/40 dark:text-white/40 text-sm mt-10">
            Say hello 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} mb-2`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed ${
                  mine
                    ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-tr-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm"
                }`}
              >
                <span className="whitespace-pre-wrap break-words">{m.text}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 pb-4 pt-2 shrink-0 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-900">
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-end gap-2 p-1.5 focus-within:border-violet-400/40 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={onKey}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-[15px] resize-none outline-none leading-relaxed py-2 px-2.5 max-h-[120px] scrollbar-hide"
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 disabled:opacity-30 flex items-center justify-center"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-900 dark:text-white" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
