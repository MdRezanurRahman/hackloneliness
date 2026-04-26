"use client";

import { useState } from "react";
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
            <span className="bg-gradient-to-br from-violet-200 via-fuchsia-200 to-indigo-200 bg-clip-text text-transparent">
              ✨ Echoes
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

      {/* Filter chips — only when there are echoes */}
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
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900/70 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white dark:text-white"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
                <span className={`ml-1.5 ${active ? "text-slate-900/70 dark:text-white/70" : "text-slate-900/30 dark:text-white/30"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid / empty / no-results */}
      {posts.length === 0 ? (
        <EmptyState isOwner={isOwner} />
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-sm text-slate-900/40 dark:text-white/40 italic">
          No {filter}s yet.
        </p>
      ) : (
        <div className="relative grid grid-cols-3 gap-1">
          {filtered.map((post) => (
            <Tile key={post.id} post={post} />
          ))}
        </div>
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

function Tile({ post }: { post: EchoTile }) {
  return (
    <Link
      href="/home"
      className="relative aspect-square overflow-hidden rounded-lg group bg-black isolate"
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
          <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-slate-900 dark:text-white">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </>
      )}

      {post.post_type === "text" && (
        // The tile uses a dark violet→indigo→slate gradient in BOTH themes
        // (it's an Instagram-style tile that pops on either page bg), so the
        // caption text stays white regardless of theme. Fixes the
        // unreadable dark-text-on-dark-tile bug after the light-theme flip.
        <div className="w-full h-full bg-gradient-to-br from-violet-500/40 via-indigo-500/30 to-slate-900 p-2 flex items-center justify-center text-center transition-transform duration-300 group-hover:scale-[1.03]">
          <p className="text-[11px] leading-snug text-white/95 line-clamp-6 break-words">
            {post.caption}
          </p>
        </div>
      )}

      {/* Subtle dark overlay on hover */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
    </Link>
  );
}
