"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClaudeMessage } from "@/lib/types/database";

const LYANNA_GREETING = "Hey, I'm Lyanna 💜 I'm here for you — as a friend, a listener, whatever you need. What's on your mind right now?";

interface Props {
  onClose?: () => void;
  /** When true, render as a full-screen modal (on mobile) or centered card (on desktop) */
  asModal?: boolean;
}

export function LyannaChat({ onClose, asModal = false }: Props) {
  const [messages, setMessages] = useState<ClaudeMessage[]>([
    { role: "assistant", content: LYANNA_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userIsScrolledUp = useRef(false);

  // Create AI session in DB on mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("ai_sessions")
        .insert({
          user_id: user.id,
          session_type: "daily_checkin",
          messages: [{ role: "assistant", content: LYANNA_GREETING }],
          insights: {},
        })
        .select("id")
        .single();
      if (data) setSessionId(data.id);
    })();
  }, []);

  // SHAKING FIX: scroll only when content genuinely grew AND user isn't scrolled up.
  // Use `instant` (not smooth) to avoid queued smooth-scrolls fighting during streaming.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (userIsScrolledUp.current) return;
    // Use scrollTop directly instead of scrollIntoView to avoid ancestor scroll propagation
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText]);

  // Track whether user scrolled up — if so, stop auto-scrolling
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userIsScrolledUp.current = distanceFromBottom > 80;
  };

  // SHAKING FIX: resize textarea without causing layout thrash
  const resizeTextarea = () => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ClaudeMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    // reset textarea height synchronously so the next render doesn't jump
    requestAnimationFrame(resizeTextarea);
    setIsLoading(true);
    setStreamingText("");
    userIsScrolledUp.current = false;

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, sessionId }),
      });
      if (!res.ok || !res.body) throw new Error(`Stream failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text?: string };
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamingText(accumulated);
            }
          } catch {
            // partial chunk
          }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      setStreamingText("");
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't hear that. Try again?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const containerClass = asModal
    ? "fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4 sm:bg-black/60 sm:backdrop-blur-sm"
    : "w-full h-full";

  return (
    <div className={containerClass}>
      <div
        className={`flex flex-col bg-white ${
          asModal
            ? "h-[100dvh] w-full sm:h-[85vh] sm:max-h-[720px] sm:w-full sm:max-w-lg sm:rounded-3xl sm:border sm:border-slate-200 overflow-hidden"
            : "h-full w-full"
        }`}
      >
        {/* Header */}
        <header className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 bg-white/90 backdrop-blur">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/40">
              L
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-slate-900 font-semibold text-[15px] leading-tight">Lyanna</h1>
            <p className="text-slate-900/50 text-xs">Always here · Private to you</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-900/50 hover:text-slate-900 transition-colors"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </header>

        {/* Messages — overscroll-contain prevents bubble-up scroll when swiping on mobile */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 scrollbar-hide"
          style={{ overscrollBehavior: "contain" }}
        >
          {messages.map((msg, i) => (
            <Bubble key={i} message={msg} />
          ))}
          {streamingText && <Bubble message={{ role: "assistant", content: streamingText }} streaming />}
          {isLoading && !streamingText && <Typing />}
        </div>

        {/* Input */}
        <div className="px-3 sm:px-4 pb-4 pt-2 shrink-0 bg-white">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl flex items-end gap-2 p-1.5 focus-within:border-violet-400/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                resizeTextarea();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message Lyanna…"
              rows={1}
              className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-[15px] resize-none outline-none leading-relaxed py-2 px-2.5 max-h-[120px] scrollbar-hide"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity flex items-center justify-center"
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-900" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function Bubble({ message, streaming }: { message: ClaudeMessage; streaming?: boolean }) {
  const isLyanna = message.role === "assistant";
  return (
    <div className={`flex ${isLyanna ? "justify-start" : "justify-end"} mb-3`}>
      {isLyanna && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0 shadow-lg shadow-violet-500/30">
          L
        </div>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
          isLyanna
            ? "bg-slate-100 text-slate-900 rounded-tl-sm"
            : "bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-tr-sm"
        }`}
      >
        <span className="whitespace-pre-wrap break-words">{message.content}</span>
        {streaming && (
          <span className="inline-block w-1.5 h-4 bg-white/60 ml-0.5 animate-pulse rounded-sm align-middle" />
        )}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
        L
      </div>
      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
