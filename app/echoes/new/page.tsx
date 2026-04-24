"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PostType } from "@/lib/types/social";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;      // 50 MB
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;       // 8 MB
const MAX_TEXT_LEN    = 500;

type Mode = PostType;

export default function NewEchoPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("text");

  // Shared
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image / video state
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    if (posting) return;
    if (next === mode) return;
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setMode(next);
    // Caption is shared — we keep it across modes
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (mode === "image") {
      if (!f.type.startsWith("image/")) {
        setError("That doesn't look like an image. Try a JPG, PNG or HEIC.");
        return;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        setError("Image must be under 8 MB.");
        return;
      }
    } else if (mode === "video") {
      if (!f.type.startsWith("video/")) {
        setError("That doesn't look like a video. Try MP4, WebM or MOV.");
        return;
      }
      if (f.size > MAX_VIDEO_BYTES) {
        setError("Video must be under 50 MB.");
        return;
      }
    }

    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  // ── Validation ──────────────────────────────────────────────────────
  const canPost =
    mode === "text"
      ? caption.trim().length > 0
      : file !== null;

  const submit = async () => {
    if (!canPost || posting) return;
    setPosting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (mode === "image" || mode === "video") {
        if (!file) throw new Error("Missing file");
        const ext = (file.name.split(".").pop() || (mode === "image" ? "jpg" : "mp4")).toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("photos")   // legacy name — bucket now accepts video too
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(path);
        if (mode === "image") imageUrl = publicUrl;
        else videoUrl = publicUrl;
      }

      const { error: insErr } = await supabase.from("posts").insert({
        user_id: user.id,
        post_type: mode,
        image_url: imageUrl,
        video_url: videoUrl,
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;

      router.push(`/profile/${user.id}`);
    } catch (err: unknown) {
      console.error("[echoes/new] failed:", err);
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Post failed";
      setError(msg);
      setPosting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <Link href="/home" className="text-white/60 hover:text-white text-sm">
          ← Cancel
        </Link>
        <h1 className="font-semibold">New echo</h1>
        <button
          onClick={submit}
          disabled={!canPost || posting}
          className="text-sm font-semibold text-violet-300 disabled:opacity-30"
        >
          {posting ? "Posting…" : "Share"}
        </button>
      </header>

      <div className="max-w-md mx-auto px-5 py-5 space-y-4">
        {/* Mode tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl">
          <ModeTab current={mode} mode="text"  onClick={switchMode} label="Text"  icon="✍️" />
          <ModeTab current={mode} mode="image" onClick={switchMode} label="Photo" icon="📷" />
          <ModeTab current={mode} mode="video" onClick={switchMode} label="Video" icon="🎬" />
        </div>

        {/* Mode-specific content area */}
        {mode === "text" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <textarea
              autoFocus
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_TEXT_LEN))}
              placeholder="What's on your mind? Share a thought, a win, a feeling, a question…"
              rows={8}
              className="w-full bg-transparent text-white text-[17px] leading-relaxed placeholder-white/30 resize-none outline-none"
            />
            <div className="flex items-center justify-between text-xs text-white/30 mt-1">
              <span>Your echo</span>
              <span>{caption.length} / {MAX_TEXT_LEN}</span>
            </div>
          </div>
        )}

        {mode === "image" && (
          <ImagePicker
            previewUrl={previewUrl}
            onPick={() => fileRef.current?.click()}
          />
        )}

        {mode === "video" && (
          <VideoPicker
            previewUrl={previewUrl}
            onPick={() => fileRef.current?.click()}
          />
        )}

        {/* Hidden file input (only rendered when needed) */}
        {mode !== "text" && (
          <input
            ref={fileRef}
            type="file"
            accept={mode === "image" ? "image/*" : "video/*"}
            onChange={onPickFile}
            className="hidden"
          />
        )}

        {/* Caption for photo/video */}
        {mode !== "text" && (
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_TEXT_LEN))}
            placeholder="Write a caption… (optional)"
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 resize-none focus:outline-none focus:border-violet-400/50"
          />
        )}

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────

function ModeTab({
  current,
  mode,
  label,
  icon,
  onClick,
}: {
  current: Mode;
  mode: Mode;
  label: string;
  icon: string;
  onClick: (m: Mode) => void;
}) {
  const active = current === mode;
  return (
    <button
      onClick={() => onClick(mode)}
      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/30"
          : "text-white/60 hover:text-white"
      }`}
    >
      <span className="mr-1.5">{icon}</span>
      {label}
    </button>
  );
}

function ImagePicker({
  previewUrl,
  onPick,
}: {
  previewUrl: string | null;
  onPick: () => void;
}) {
  if (previewUrl) {
    return (
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        <button
          onClick={onPick}
          className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-xs"
        >
          Change
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onPick}
      className="w-full aspect-square bg-white/5 border-2 border-dashed border-white/15 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-2xl">
        📷
      </div>
      <p className="text-white/70 text-sm">Tap to pick a photo</p>
      <p className="text-white/30 text-xs">JPG, PNG, HEIC · up to 8 MB</p>
    </button>
  );
}

function VideoPicker({
  previewUrl,
  onPick,
}: {
  previewUrl: string | null;
  onPick: () => void;
}) {
  if (previewUrl) {
    return (
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
        <video
          src={previewUrl}
          controls
          playsInline
          className="w-full h-full object-cover"
        />
        <button
          onClick={onPick}
          className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-xs"
        >
          Change
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onPick}
      className="w-full aspect-video bg-white/5 border-2 border-dashed border-white/15 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-2xl">
        🎬
      </div>
      <p className="text-white/70 text-sm">Tap to pick a video</p>
      <p className="text-white/30 text-xs">MP4, WebM, MOV · up to 50 MB</p>
    </button>
  );
}
