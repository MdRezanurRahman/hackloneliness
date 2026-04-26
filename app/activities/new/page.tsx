"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_CATEGORIES } from "@/lib/types/social";

// Leaflet touches `window` at module load → SSR breaks. Load it client-only.
const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-center text-slate-900/30 dark:text-white/30 text-sm">
      Loading map…
    </div>
  ),
});

export default function NewActivityPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("coffee");
  const [city, setCity] = useState("");
  const [addressLabel, setAddressLabel] = useState("");
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [durationMins, setDurationMins] = useState(60);
  const [maxAttendees, setMaxAttendees] = useState(4);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length >= 3 && startsAt && coords !== null;

  const save = async () => {
    if (!canSave || !coords) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const startsIso = new Date(startsAt).toISOString();

      const { data, error: insErr } = await supabase
        .from("activities")
        .insert({
          host_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category,
          city: city.trim() || null,
          address_label: addressLabel.trim() || null,
          latitude: coords.lat,
          longitude: coords.lng,
          starts_at: startsIso,
          duration_mins: durationMins,
          max_attendees: maxAttendees,
          current_count: 1,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      // Add host as confirmed attendee
      await supabase.from("activity_attendees").insert({
        activity_id: data.id,
        user_id: user.id,
        status: "confirmed",
      });

      router.push(`/activities/${data.id}`);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Save failed";
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black dark:bg-black text-slate-900 dark:text-white">
      <header className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900">
        <Link href="/activities" className="text-slate-900/60 dark:text-white/60 text-sm">← Cancel</Link>
        <h1 className="font-semibold">Host a meetup</h1>
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="text-sm font-semibold text-violet-600 dark:text-violet-400 disabled:opacity-30"
        >
          {saving ? "Creating…" : "Create"}
        </button>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-5">
        <Field label="What's the plan?">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Coffee at Blue Bottle"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-violet-400/50 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </Field>

        <Field label="Category">
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`py-3 rounded-xl border text-sm font-medium ${
                  category === c.value
                    ? "bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border-violet-400 text-white"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900/70 dark:text-white/70"
                }`}
              >
                <span className="mr-1.5">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="When?">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-violet-400/50 [color-scheme:light]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (min)">
            <input
              type="number"
              min={15}
              max={360}
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-violet-400/50"
            />
          </Field>
          <Field label="Max attendees">
            <input
              type="number"
              min={2}
              max={50}
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-violet-400/50"
            />
          </Field>
        </div>

        <Field label="Pin the meetup spot (required)">
          <LocationPicker
            value={coords}
            onChange={setCoords}
            onAddressFound={(addr) => {
              // Auto-fill the address label only if the user hasn't typed one
              if (addr && !addressLabel.trim()) {
                setAddressLabel(addr.split(",").slice(0, 3).join(", "));
              }
            }}
          />
          <p className="text-xs text-slate-900/40 dark:text-white/40 mt-2">
            Search for a venue or tap on the map. Drag the pin to fine-tune. The
            exact spot stays hidden from attendees until you reveal it.
          </p>
        </Field>

        <Field label="Where (city)">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Melbourne"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-violet-400/50 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </Field>

        <Field label="Meeting spot (optional)">
          <input
            value={addressLabel}
            onChange={(e) => setAddressLabel(e.target.value)}
            placeholder="e.g. Central Park south entrance"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-violet-400/50 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </Field>

        <Field label="Details (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Anything else people should know…"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl resize-none focus:outline-none focus:border-violet-400/50 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </Field>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-900/60 dark:text-white/60 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
