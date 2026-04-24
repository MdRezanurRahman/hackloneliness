"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_CATEGORIES, type NearbyActivityRow } from "@/lib/types/social";

/** Sydney CBD (Town Hall) — fallback when the user denies geolocation. */
const SYDNEY_FALLBACK = { lat: -33.8734, lng: 151.2061 };
const DEFAULT_RADIUS_M = 5000;
const DEFAULT_LIMIT = 12;

type GeoState =
  | { kind: "pending" }
  | { kind: "granted"; lat: number; lng: number }
  | { kind: "denied"; reason: string }
  | { kind: "unsupported" };

export function NearbyActivities() {
  const [geo, setGeo] = useState<GeoState>({ kind: "pending" });
  const [rows, setRows] = useState<NearbyActivityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ask for geolocation on mount
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ kind: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          kind: "granted",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setGeo({ kind: "denied", reason: err.message });
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 60_000 },
    );
  }, []);

  // Once we have coords (granted or fallback), call the RPC
  useEffect(() => {
    const coords =
      geo.kind === "granted"
        ? { lat: geo.lat, lng: geo.lng }
        : geo.kind === "denied" || geo.kind === "unsupported"
        ? SYDNEY_FALLBACK
        : null;
    if (!coords) return;

    let cancelled = false;
    (async () => {
      setError(null);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("nearby_activities", {
        lat: coords.lat,
        lng: coords.lng,
        radius_m: DEFAULT_RADIUS_M,
        max_count: DEFAULT_LIMIT,
      });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as NearbyActivityRow[]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geo]);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-lg">Happening near you</h2>
          <LocationLabel geo={geo} />
        </div>
        <Link href="/activities" className="text-sm text-violet-300 hover:text-violet-200">
          See all →
        </Link>
      </div>

      {geo.kind === "pending" || rows === null ? (
        <SkeletonRow />
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-300">
          Couldn&apos;t load nearby meetups: {error}
        </div>
      ) : rows.length === 0 ? (
        <EmptyCard geo={geo} />
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2 snap-x">
          {rows.map((a) => (
            <NearbyCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
function LocationLabel({ geo }: { geo: GeoState }) {
  if (geo.kind === "pending") {
    return <p className="text-white/40 text-xs mt-0.5">Finding your location…</p>;
  }
  if (geo.kind === "granted") {
    return <p className="text-white/40 text-xs mt-0.5">Within 5 km of you</p>;
  }
  return (
    <p className="text-white/40 text-xs mt-0.5">
      Showing Sydney CBD · share location for nearby results
    </p>
  );
}

function NearbyCard({ activity }: { activity: NearbyActivityRow }) {
  const cat = ACTIVITY_CATEGORIES.find((c) => c.value === activity.category);
  const start = new Date(activity.starts_at);
  const mins = Math.round((start.getTime() - Date.now()) / 60000);
  const when =
    mins < 60
      ? `in ${Math.max(mins, 0)} min`
      : mins < 1440
      ? `in ${Math.round(mins / 60)}h`
      : start.toLocaleString(undefined, {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
        });

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="snap-start shrink-0 w-64 bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{cat?.icon ?? "✨"}</span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200">
          {formatDistance(activity.distance_m)}
        </span>
      </div>
      <h3 className="font-semibold text-white line-clamp-2 leading-snug mb-1">
        {activity.title}
      </h3>
      <p className="text-white/50 text-xs mb-3">
        {when} · {activity.address_label ?? activity.city ?? "Nearby"}
      </p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">
          {activity.current_count}/{activity.max_attendees} joined
        </span>
        <span className="text-violet-300">by {activity.host_display_name}</span>
      </div>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 overflow-x-hidden -mx-5 px-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="shrink-0 w-64 h-[128px] bg-white/5 border border-white/10 rounded-2xl animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyCard({ geo }: { geo: GeoState }) {
  const msg =
    geo.kind === "granted"
      ? "No meetups within 5 km right now. Be the first to host."
      : "No meetups near Sydney CBD right now. Be the first to host.";
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
      <p className="font-medium mb-1">Quiet around here 🦗</p>
      <p className="text-white/50 text-sm mb-4">{msg}</p>
      <Link
        href="/activities/new"
        className="inline-block px-4 py-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-sm font-semibold"
      >
        Host a meetup
      </Link>
    </div>
  );
}

function formatDistance(m: number): string {
  if (m < 50) return "right here";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
