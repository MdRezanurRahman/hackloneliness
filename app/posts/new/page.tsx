"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewPostPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setError("Image must be under 8 MB.");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    setPosting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(path);

      const { error: insErr } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;

      router.push(`/profile/${user.id}`);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Upload failed";
      setError(msg);
      setPosting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <Link href="/home" className="text-white/60 hover:text-white text-sm">← Cancel</Link>
        <h1 className="font-semibold">New post</h1>
        <button
          onClick={submit}
          disabled={!file || posting}
          className="text-sm font-semibold text-violet-300 disabled:opacity-30"
        >
          {posting ? "Posting…" : "Share"}
        </button>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />

        {preview ? (
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-xs"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-square bg-white/5 border-2 border-dashed border-white/15 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-white/70 text-sm">Tap to pick a photo</p>
            <p className="text-white/30 text-xs">JPG or PNG · up to 8 MB</p>
          </button>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption…"
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 resize-none focus:outline-none focus:border-violet-400/50"
        />

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
