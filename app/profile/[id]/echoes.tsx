"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PostType } from "@/lib/types/social";

export interface EchoTile {
  id: string;
  post_type: PostType;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
}

type Filter = "all" | PostType;

const FILTER_TABS: { value: Filter; label: string; icon: string }[] = [
  { value: "all",   label: "All",    icon: "✨" },
  { value: "image", label: "Photos", icon: "📷" },
  { value: "video", label: "Videos", icon: "🎬" },
  { value: "text",  label: "Words",  icon: "📝" },
];

export function EchoesSection({
  posts,
  isOwner,
}: {
  posts: EchoTile[];
  isOwner: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  // null = no echo expanded; string = id of the echo currently expanded in the modal
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = {
    all:   posts.length,
    image: posts.filter((p) => p.post_type === "image").length,
    video: posts.filter((p) => p.post_type === "video").length,
    text:  posts.filter((p) => p.post_type === "text").length,
  };

  const filtered = filter === "all" ? posts : posts.filter((p) => p.post_type === filter);

  return (
    <section className="px-5 py-7 relative overflow-hidden">
      {/* Decorative gradient blob behind the header */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-violet-500/15 blur-3xl pointer-events-none"
      />

      {/* Header */}
      <div className="relative flex items-end justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-600 dark:from-violet-300 dark:via-fuchsia-300 dark:to-indigo-300 bg-clip-text text-transparent">
              ✨ Posted Echoes
            </span>
          </h2>
          <p className="text-slate-900/50 dark:text-white/50 text-xs mt-0.5">
            {posts.length === 0
              ? "No moments shared yet"
              : `${posts.length} shared moment${posts.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {isOwner && posts.length > 0 && (
          <Link
            href="/echoes/new"
            className="px-3 py-1.5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/40 hover:opacity-95 transition-opacity"
          >
            + Share
          </Link>
        )}
      </div>

      {/* Filter chips */}
      {posts.length > 0 && (
        <div className="relative flex gap-1.5 mb-4 -mx-5 px-5 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => {
            const count    = counts[tab.value];
            const active   = filter === tab.value;
            const disabled = count === 0 && tab.value !== "all";
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => !disabled && setFilter(tab.value)}
                disabled={disabled}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  active
                    ? "bg-gradient-to-br from-violet-500 to-indigo-500 border-transparent text-white shadow-lg shadow-violet-500/30"
                    : disabled
                    ? "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-900 text-slate-900/20 dark:text-white/20 cursor-not-allowed"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900/70 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
                <span className={`ml-1.5 ${active ? "text-white/70" : "text-slate-900/30 dark:text-white/30"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid (default — 3 per row) */}
      {posts.length === 0 ? (
        <EmptyState isOwner={isOwner} />
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-sm text-slate-900/40 dark:text-white/40 italic">
          No {filter}s yet.
        </p>
      ) : (
        <div className="relative grid grid-cols-3 gap-1">
          {filtered.map((post) => (
            <GridTile
              key={post.id}
              post={post}
              onClick={() => setSelectedId(post.id)}
            />
          ))}
        </div>
      )}

      {/* Modal: expanded echo + scrollable vertical stack */}
      {selectedId && (
        <EchoModal
          echoes={filtered}
          initialId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Bottom inviting CTA for owner with content */}
      {isOwner && posts.length > 0 && (
        <Link
          href="/echoes/new"
          className="relative mt-6 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/10 border border-violet-400/25 hover:from-violet-500/25 hover:to-indigo-500/20 transition-colors"
        >
          <span className="text-lg">✨</span>
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Share another echo</span>
        </Link>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Grid tile — click triggers the modal, NOT navigation
// ─────────────────────────────────────────────────────────────────────

function GridTile({
  post,
  onClick,
}: {
  post: EchoTile;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open echo"
      className="relative aspect-square overflow-hidden rounded-lg group bg-black isolate text-left active:scale-[0.98] transition-transform"
    >
      {post.post_type === "image" && post.image_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.image_url}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {post.post_type === "video" && post.video_url && (
        <>
          <video
            src={post.video_url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </>
      )}

      {post.post_type === "text" && (
        // Permanently-dark gradient tile — caption stays white in both themes.
        <div className="w-full h-full bg-gradient-to-br from-violet-500/40 via-indigo-500/30 to-slate-900 p-2 flex items-center justify-center text-center transition-transform duration-300 group-hover:scale-[1.03]">
          <p className="text-[11px] leading-snug text-white/95 line-clamp-6 break-words">
            {post.caption}
          </p>
        </div>
      )}

      {/* Subtle hover overlay */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Modal — selected echo prominent, scroll for the rest in a single column
// ─────────────────────────────────────────────────────────────────────

function EchoModal({
  echoes,
  initialId,
  onClose,
}: {
  echoes: EchoTile[];
  initialId: string;
  onClose: () => void;
}) {
  const initialRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Scroll the selected echo to the top of the modal on open
  useEffect(() => {
    initialRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);

  return (
    // Outer overlay: tap anywhere outside a card to close
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm animate-echo-modal-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Echo viewer"
    >
      {/* Close button — sticky to the top-right of the viewport */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur text-white text-xl leading-none flex items-center justify-center transition-colors"
      >
        ✕
      </button>

      {/* Vertical column of echoes — selected one renders first, rest follow */}
      <div className="relative max-w-lg mx-auto px-4 py-12 space-y-6">
        {echoes.map((echo) => (
          <div
            key={echo.id}
            ref={echo.id === initialId ? initialRef : null}
            onClick={(e) => e.stopPropagation()}
            className="scroll-mt-12"
          >
            <ExpandedCard post={echo} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Single expanded echo card used inside the modal (full-width, readable).
function ExpandedCard({ post }: { post: EchoTile }) {
  return (
    <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/30">
      {post.post_type === "image" && post.image_url && (
        <div className="relative bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image_url}
            alt={post.caption ?? ""}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
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
        <div className="px-6 py-10 bg-gradient-to-br from-violet-500/15 via-indigo-500/8 to-transparent">
          <p className="text-[19px] leading-relaxed whitespace-pre-wrap break-words text-slate-900 dark:text-white">
            {post.caption}
          </p>
        </div>
      )}

      {/* Caption + label for image/video; just label for text (caption is the body) */}
      {post.post_type !== "text" && post.caption && (
        <div className="px-5 py-4">
          <p className="text-[15px] leading-relaxed text-slate-900/85 dark:text-white/85 whitespace-pre-wrap break-words">
            {post.caption}
          </p>
        </div>
      )}

      <div className="px-5 pb-4 pt-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-900/40 dark:text-white/40">
        <span>
          {post.post_type === "text" ? "📝 Thought" : post.post_type === "image" ? "📷 Photo" : "🎬 Clip"}
        </span>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────

function EmptyState({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="text-center py-10 px-4 bg-gradient-to-br from-violet-500/15 via-indigo-500/8 to-transparent rounded-3xl border border-violet-400/10">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 mb-3 shadow-lg shadow-violet-500/40">
        <span className="text-2xl">✨</span>
      </div>
      <p className="font-semibold text-slate-900 dark:text-white mb-1.5">No echoes yet</p>
      {isOwner ? (
        <>
          <p className="text-sm text-slate-900/50 dark:text-white/50 mb-5 max-w-xs mx-auto">
            Your first thought, photo, or clip — share what you&apos;re up to and let your people find you.
          </p>
          <Link
            href="/echoes/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 hover:opacity-95"
          >
            <span>✨</span>
            <span>Start sharing</span>
          </Link>
        </>
      ) : (
        <p className="text-sm text-slate-900/50 dark:text-white/50 max-w-xs mx-auto">
          When they share something, it&apos;ll show up here.
        </p>
      )}
    </div>
  );
}
