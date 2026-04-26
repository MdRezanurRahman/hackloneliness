"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_CATEGORIES } from "@/lib/types/social";

export interface PastEventRow {
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

export function PastEventsList({
  events,
  isOwner,
}: {
  events: PastEventRow[];
  isOwner: boolean;
}) {
  if (events.length === 0) return null;

  return (
    <section>
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">
          Past meetups
          <span className="ml-2 text-white/40 text-sm font-normal">
            {events.length}
          </span>
        </h3>
        {isOwner && (
          <span className="text-[11px] text-white/40">
            Tap a chip to make it public or private
          </span>
        )}
      </div>
      <ul className="px-5 pb-5 space-y-2">
        {events.map((e) => (
          <PastEventCard key={e.id} event={e} isOwner={isOwner} />
        ))}
      </ul>
    </section>
  );
}

function PastEventCard({
  event,
  isOwner,
}: {
  event: PastEventRow;
  isOwner: boolean;
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

  const togglePrivacy = async (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
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
        className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 hover:bg-white/[0.07] transition-colors"
      >
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-400/20 flex items-center justify-center text-xl">
          {cat?.icon ?? "✨"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{event.title}</p>
          <p className="text-xs text-white/50 truncate">
            {dateLabel} · {event.duration_mins} min · {event.current_count} attended
          </p>
        </div>

        {isOwner ? (
          <button
            type="button"
            onClick={togglePrivacy}
            disabled={busy}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors disabled:opacity-50 ${
              isPublic
                ? "bg-violet-500/15 border-violet-400/30 text-violet-200 hover:bg-violet-500/25"
                : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10"
            }`}
            aria-label={isPublic ? "Make private" : "Make public"}
          >
            {isPublic ? "🌐 Public" : "🔒 Private"}
          </button>
        ) : null}
      </Link>
    </li>
  );
}
