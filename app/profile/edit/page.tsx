"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChipGrid,
  VicePicker,
  SocialBatterySlider,
  DobPicker,
  INPUT_STYLE,
} from "@/components/profile-primitives";
import {
  FAITH_CHOICES,
  GENDER_CHOICES,
  WEEKEND_CHOICES,
  INTENT_CHOICES,
  STRESS_CHOICES,
  BARRIER_CHOICES,
  calculateAge,
  type FaithOption,
  type GenderOption,
  type ViceOption,
  type WeekendOption,
  type IntentOption,
  type StressOption,
  type BarrierOption,
} from "@/lib/onboarding/form-schema";

// Full shape of the edit form — union of core account fields + all onboarding data
interface EditFormState {
  // Core
  display_name: string;
  bio: string;
  avatar_url: string | null;

  // Section A — Basics
  full_name: string;
  dob: string;
  gender: GenderOption | "";
  education: string;
  occupation: string;

  // Section B — The Vibe
  religion: FaithOption | "";
  social_battery: number;
  drinking: ViceOption | "";
  smoking: ViceOption | "";
  ideal_weekend: WeekendOption[];

  // Section C — Inner State
  intent: IntentOption | "";
  stress_handling: StressOption | "";
  barrier: BarrierOption | "";
}

const EMPTY: EditFormState = {
  display_name: "",
  bio: "",
  avatar_url: null,
  full_name: "",
  dob: "",
  gender: "",
  education: "",
  occupation: "",
  religion: "",
  social_battery: 3,
  drinking: "",
  smoking: "",
  ideal_weekend: [],
  intent: "",
  stress_handling: "",
  barrier: "",
};

export default function EditProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<EditFormState>(EMPTY);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current user data
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
        .select("display_name, full_name, bio, avatar_url, gender, ai_profile")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        const ai = (data.ai_profile ?? {}) as Record<string, unknown>;
        setForm({
          display_name: data.display_name ?? "",
          bio: data.bio ?? "",
          avatar_url: data.avatar_url,
          full_name: data.full_name ?? "",
          dob: (ai.dob as string) ?? "",
          gender: (data.gender as GenderOption) ?? "",
          education: (ai.education as string) ?? "",
          occupation: (ai.occupation as string) ?? "",
          religion: (ai.religion as FaithOption) ?? "",
          social_battery: (ai.social_battery as number) ?? 3,
          drinking: (ai.drinking as ViceOption) ?? "",
          smoking: (ai.smoking as ViceOption) ?? "",
          ideal_weekend: (ai.ideal_weekend as WeekendOption[]) ?? [],
          intent: (ai.intent as IntentOption) ?? "",
          stress_handling: (ai.stress_handling as StressOption) ?? "",
          barrier: (ai.barrier as BarrierOption) ?? "",
        });
      }
      setLoading(false);
    })();
  }, [router]);

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please pick an image.");
      return;
    }
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

      // Avatar upload (if changed)
      let avatarUrl: string | null = form.avatar_url;
      if (newAvatar) {
        const ext = newAvatar.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("photos")
          .upload(path, newAvatar, { contentType: newAvatar.type });
        if (upErr) throw upErr;
        avatarUrl = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }

      // Derive display_name: if they edited full_name but left display_name empty,
      // use first word of full_name.
      const displayName =
        form.display_name.trim() ||
        form.full_name.trim().split(/\s+/)[0] ||
        "Friend";

      const age = form.dob ? calculateAge(form.dob) : null;

      const { error: updErr } = await supabase
        .from("users")
        .update({
          display_name: displayName,
          full_name: form.full_name.trim() || null,
          bio: form.bio.trim() || null,
          avatar_url: avatarUrl,
          age,
          gender: form.gender || null,
          ai_profile: {
            dob: form.dob,
            education: form.education.trim(),
            occupation: form.occupation.trim(),
            religion: form.religion,
            social_battery: form.social_battery,
            drinking: form.drinking,
            smoking: form.smoking,
            ideal_weekend: form.ideal_weekend,
            intent: form.intent,
            stress_handling: form.stress_handling,
            barrier: form.barrier,
          },
        })
        .eq("id", user.id);
      if (updErr) throw updErr;

      router.push(`/profile/${user.id}`);
    } catch (err: unknown) {
      console.error("[profile/edit] save failed:", err);
      let msg = "Save failed";
      if (err && typeof err === "object") {
        const e = err as { message?: string; code?: string; hint?: string };
        const parts = [e.message, e.code ? `(code: ${e.code})` : null, e.hint].filter(Boolean);
        if (parts.length) msg = parts.join(" — ");
      }
      setError(msg);
      setSaving(false);
    }
  };

  const signOut = async () => {
    const ok = confirm("Sign out of hackloneliness?");
    if (!ok) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
        <p className="text-slate-900/50">Loading your profile…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-20">
      <header className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <Link href="/profile/me" className="text-slate-900/60 text-sm">← Cancel</Link>
        <h1 className="font-semibold">Edit profile</h1>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm font-semibold text-violet-600 disabled:opacity-30"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-8">
        {/* ─── Avatar ─────────────────────────────────────────── */}
        <section className="flex flex-col items-center gap-3">
          <div className="relative">
            {preview || form.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={preview ?? form.avatar_url!}
                alt=""
                className="w-28 h-28 rounded-full object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-4xl">
                {(form.full_name || form.display_name)[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm text-violet-600 hover:text-violet-700"
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
        </section>

        {/* ─── Quick edits ────────────────────────────────────── */}
        <section className="space-y-4">
          <Label>Display name</Label>
          <input
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="What your community sees"
            className={INPUT_STYLE}
          />
          <p className="text-slate-900/40 text-xs -mt-3">
            Usually the first word of your full name. Only you can change it.
          </p>

          <Label>Bio</Label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 200) })}
            rows={3}
            placeholder="A line or two about you…"
            className={`${INPUT_STYLE} resize-none`}
          />
          <p className="text-right text-xs text-slate-900/30 -mt-3">{form.bio.length}/200</p>
        </section>

        {/* ─── Section A: The Basics ─────────────────────────── */}
        <SectionHeading emoji="📇" label="The Basics" />

        <section className="space-y-4">
          <Field label="Full name">
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g. Sam Taylor"
              className={INPUT_STYLE}
            />
          </Field>

          <Field label="Date of birth">
            <DobPicker value={form.dob} onChange={(dob) => setForm({ ...form, dob })} />
          </Field>

          <Field label="Gender">
            <ChipGrid
              options={GENDER_CHOICES}
              value={form.gender ? [form.gender] : []}
              onChange={(vals) =>
                setForm({ ...form, gender: (vals[0] as GenderOption) ?? "" })
              }
              mode="single"
            />
          </Field>

          <Field label="What are you studying?">
            <input
              value={form.education}
              onChange={(e) => setForm({ ...form, education: e.target.value })}
              placeholder="e.g. Master of Data Science at UTS"
              className={INPUT_STYLE}
            />
          </Field>

          <Field label="What do you do?">
            <input
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              placeholder="e.g. Software engineer at Canva · or “Student”"
              className={INPUT_STYLE}
            />
          </Field>
        </section>

        {/* ─── Section B: The Vibe ────────────────────────────── */}
        <SectionHeading emoji="🎧" label="The Vibe" />

        <section className="space-y-5">
          <Field label="Faith or philosophy">
            <ChipGrid
              options={FAITH_CHOICES}
              value={form.religion ? [form.religion] : []}
              onChange={(vals) =>
                setForm({ ...form, religion: (vals[0] as FaithOption) ?? "" })
              }
              mode="single"
            />
          </Field>

          <Field label="Social battery">
            <SocialBatterySlider
              value={form.social_battery}
              onChange={(v) => setForm({ ...form, social_battery: v })}
            />
          </Field>

          <Field label="Drinking & smoking">
            <div className="space-y-4">
              <VicePicker
                label="Drinking"
                value={form.drinking}
                onChange={(v) => setForm({ ...form, drinking: v })}
              />
              <VicePicker
                label="Smoking"
                value={form.smoking}
                onChange={(v) => setForm({ ...form, smoking: v })}
              />
            </div>
          </Field>

          <Field label="Ideal weekend">
            <ChipGrid
              options={WEEKEND_CHOICES}
              value={form.ideal_weekend}
              onChange={(vals) =>
                setForm({ ...form, ideal_weekend: vals as WeekendOption[] })
              }
              mode="multi"
            />
          </Field>
        </section>

        {/* ─── Section C: Inner State ────────────────────────── */}
        <SectionHeading emoji="💭" label="Inner State" />

        <section className="space-y-5">
          <Field label="What brings you here?">
            <ChipGrid
              options={INTENT_CHOICES}
              value={form.intent ? [form.intent] : []}
              onChange={(vals) =>
                setForm({ ...form, intent: (vals[0] as IntentOption) ?? "" })
              }
              mode="single"
              columns={1}
            />
          </Field>

          <Field label="How do you handle stress?">
            <ChipGrid
              options={STRESS_CHOICES}
              value={form.stress_handling ? [form.stress_handling] : []}
              onChange={(vals) =>
                setForm({ ...form, stress_handling: (vals[0] as StressOption) ?? "" })
              }
              mode="single"
              columns={1}
            />
          </Field>

          <Field label="Biggest barrier to meeting people">
            <ChipGrid
              options={BARRIER_CHOICES}
              value={form.barrier ? [form.barrier] : []}
              onChange={(vals) =>
                setForm({ ...form, barrier: (vals[0] as BarrierOption) ?? "" })
              }
              mode="single"
              columns={1}
            />
          </Field>
        </section>

        {/* ─── Error + Save shortcut ─────────────────────────── */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        {/* ─── Danger zone ───────────────────────────────────── */}
        <div className="pt-6 mt-2 border-t border-slate-100">
          <p className="text-xs text-slate-900/40 mb-2">Account</p>
          <button
            type="button"
            onClick={signOut}
            className="w-full py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium hover:bg-red-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}

// ─── Small layout helpers ────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-slate-900/60">{children}</label>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-slate-900/70 font-medium mb-2">{label}</p>
      {children}
    </div>
  );
}

function SectionHeading({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-4">
      <span className="text-xl">{emoji}</span>
      <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
      <div className="flex-1 h-px bg-slate-100 ml-1" />
    </div>
  );
}
