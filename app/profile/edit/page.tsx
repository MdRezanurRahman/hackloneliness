"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setAvatar(data.avatar_url);
      }
    })();
  }, [router]);

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setNewAvatar(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let avatarUrl = avatar;
      if (newAvatar) {
        const ext = newAvatar.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("photos")
          .upload(path, newAvatar, { contentType: newAvatar.type });
        if (upErr) throw upErr;
        avatarUrl = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }

      const { error: updErr } = await supabase
        .from("users")
        .update({
          display_name: displayName.trim() || "Anon",
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);
      if (updErr) throw updErr;
      router.push(`/profile/${user.id}`);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Save failed";
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <Link href="/profile/me" className="text-white/60 text-sm">← Cancel</Link>
        <h1 className="font-semibold">Edit profile</h1>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm font-semibold text-violet-300 disabled:opacity-30"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {preview || avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview ?? avatar!} alt="" className="w-28 h-28 rounded-full object-cover" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-4xl">
                {displayName[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm text-violet-300 hover:text-violet-200"
          >
            Change photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickAvatar}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1.5">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-400/50"
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="A line or two about you…"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-violet-400/50 placeholder-white/30"
          />
          <p className="text-right text-xs text-white/30 mt-1">{bio.length}/200</p>
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
