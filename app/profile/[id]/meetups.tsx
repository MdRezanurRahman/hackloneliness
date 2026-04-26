"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_CATEGORIES } from "@/lib/types/social";

export interface MeetupRow {
  id: string;
  title: string;
  category: string;
  city: string | null;
  address_label: string | null;
  starts_at: string;
  duration_mins: number;
  current_count: number;
  max_attendees: number;
  is_public: boolean;
  status: string;
}

/**
 * Two-column meetups section: Upcoming + Past, side by side.
 * Owner sees a privacy chip on each past event; visitors don't.
 */
export function MeetupsRow({
  upcoming,
  past,
  isOwner,
}: {
  upcoming: MeetupRow[];
  past: MeetupRow[];
  isOwner: boolean;
}) {
  if (upcoming.length === 0 && past.length === 0) return null;

  return (
    <section className="px-5 py-5">
      <div className="grid grid-cols-2 gap-3">
        <MeetupColumn
          title="Upcoming"
          emoji="📅"
          events={upcoming}
          isOwner={isOwner}
          isPast={false}
          empty="Nothing scheduled"
        />
        <MeetupColumn
          title="Past"
          emoji="📜"
          events={past}
          isOwner={isOwner}
          isPast={true}
          empty="No history yet"
        />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────

function MeetupColumn({
  title,
  emoji,
  events,
  isOwner,
  isPast,
  empty,
}: {
  title: string;
  emoji: string;
  events: MeetupRow[];
  isOwner: boolean;
  isPast: boolean;
  empty: string;
}) {
  // Each column owns its own open state — toggling one never touches the
  // other. Hidden by default per spec; first click expands, second click
  // collapses again.
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-1.5 px-3 py-2.5 border rounded-xl transition-colors text-left ${
          open
            ? "bg-slate-100 border-violet-400/30"
            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
        }`}
      >
        <span className="text-base shrink-0">{emoji}</span>
        <span className="font-semibold text-sm text-slate-900 truncate">{title}</span>
        <span className="text-slate-900/40 text-xs">{events.length}</span>
        <Chevron open={open} className="ml-auto" />
      </button>

      {open && (
        <div className="mt-2">
          {events.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[11px] text-slate-900/40">{empty}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <MeetupCardCompact
                  key={e.id}
                  event={e}
                  isOwner={isOwner}
                  isPast={isPast}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Chevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className={`w-4 h-4 text-slate-900/40 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      } ${className ?? ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MeetupCardCompact({
  event,
  isOwner,
  isPast,
}: {
  event: MeetupRow;
  isOwner: boolean;
  isPast: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(event.is_public);
  const [busy, setBusy] = useState(false);

  const cat = ACTIVITY_CATEGORIES.find((c) => c.value === event.category);
  const start = new Date(event.starts_at);
  const dateLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const togglePrivacy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !isPublic;
    setBusy(true);
    setIsPublic(next);   // optimistic
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("activities")
        .update({ is_public: next })
        .eq("id", event.id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error(err);
      setIsPublic(!next);   // rollback
      alert(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not update privacy",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <li>
      <Link
        href={`/activities/${event.id}`}
        className="block bg-slate-50 border border-slate-200 rounded-xl p-2.5 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className="text-lg shrink-0 leading-none mt-0.5">{cat?.icon ?? "✨"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[13px] text-slate-900 leading-tight line-clamp-2">
              {event.title}
            </p>
            <p className="text-[11px] text-slate-900/40 mt-1">
              {dateLabel} · {event.duration_mins}m
            </p>
          </div>
        </div>
        {isOwner && isPast && (
          <button
            type="button"
            onClick={togglePrivacy}
            disabled={busy}
            className={`mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors disabled:opacity-50 ${
              isPublic
                ? "bg-violet-500/15 border-violet-400/30 text-violet-700 hover:bg-violet-200"
                : "bg-slate-50 border-slate-200 text-slate-900/60 hover:bg-slate-100"
            }`}
            aria-label={isPublic ? "Make private" : "Make public"}
          >
            {isPublic ? "🌐 Public" : "🔒 Private"}
          </button>
        )}
      </Link>
    </li>
  );
}
