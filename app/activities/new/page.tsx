"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_CATEGORIES } from "@/lib/types/social";

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
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length >= 3 && startsAt && coords !== null;

  const captureLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Your browser doesn't support geolocation.");
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoBusy(false);
      },
      (err) => {
        setGeoError(err.message || "Couldn't get your location.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

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
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <Link href="/activities" className="text-white/60 text-sm">← Cancel</Link>
        <h1 className="font-semibold">Host a meetup</h1>
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="text-sm font-semibold text-violet-300 disabled:opacity-30"
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-400/50 placeholder-white/30"
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
                    : "bg-white/5 border-white/10 text-white/70"
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-400/50 [color-scheme:dark]"
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
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-400/50"
            />
          </Field>
          <Field label="Max attendees">
            <input
              type="number"
              min={2}
              max={50}
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-400/50"
            />
          </Field>
        </div>

        <Field label="Your location (required)">
          <button
            type="button"
            onClick={captureLocation}
            disabled={geoBusy}
            className={`w-full px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-colors ${
              coords
                ? "bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border-violet-400/40 text-white"
                : "bg-white/5 border-white/10 text-white/80 hover:bg-white/[0.07]"
            } disabled:opacity-60`}
          >
            {geoBusy ? (
              "📍 Getting your location…"
            ) : coords ? (
              <>
                <span className="mr-2">✓</span>
                Pinned at {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} · tap to update
              </>
            ) : (
              "📍 Use my current location"
            )}
          </button>
          <p className="text-xs text-white/40 mt-1.5">
            Nearby people will see this meetup based on the pin. Only the precise pin
            is stored; what they see is the meeting spot label below.
          </p>
          {geoError && (
            <p className="text-xs text-red-300 mt-1.5">{geoError}</p>
          )}
        </Field>

        <Field label="Where (city)">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Melbourne"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-400/50 placeholder-white/30"
          />
        </Field>

        <Field label="Meeting spot (optional)">
          <input
            value={addressLabel}
            onChange={(e) => setAddressLabel(e.target.value)}
            placeholder="e.g. Central Park south entrance"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-400/50 placeholder-white/30"
          />
        </Field>

        <Field label="Details (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Anything else people should know…"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-violet-400/50 placeholder-white/30"
          />
        </Field>

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
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
      <label className="block text-xs text-white/60 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
