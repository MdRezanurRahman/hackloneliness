"use client";

/**
 * Map-based location picker using Leaflet + OpenStreetMap.
 * No API key required.
 *
 * Default-exported so the consumer can dynamic-import it with
 * `ssr: false` (Leaflet touches `window` at module load time
 * and breaks SSR).
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet's broken default marker assets when bundled ──────────
// Leaflet ships PNGs but its default icon URLs assume CDN-style paths.
// Reset the icon to inline SVG data URLs so it renders in any bundler.
const VIOLET_PIN = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a78bfa"/>
        <stop offset="1" stop-color="#6366f1"/>
      </linearGradient>
    </defs>
    <path fill="url(#g)" stroke="#fff" stroke-width="2"
      d="M16 1c-8 0-14 6-14 14 0 10 14 28 14 28s14-18 14-28c0-8-6-14-14-14z"/>
    <circle cx="16" cy="15" r="5" fill="#fff"/>
  </svg>`)}`;

const violetIcon = L.icon({
  iconUrl: VIOLET_PIN,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -40],
});

// ── Types ────────────────────────────────────────────────────────────
export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationPickerProps {
  /** Currently-pinned location (null until user drops a pin) */
  value: LatLng | null;
  /** Called when user moves the pin (click, drag, or search-result selection) */
  onChange: (latlng: LatLng) => void;
  /** Initial map center if value is null */
  defaultCenter?: LatLng;
  /** Optional address line that auto-populates from reverse geocoding */
  onAddressFound?: (address: string | null) => void;
}

// ── Subcomponents ────────────────────────────────────────────────────

function ClickToPin({
  onChange,
}: {
  onChange: (latlng: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ center }: { center: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [center, map]);
  return null;
}

function DraggableMarker({
  position,
  onChange,
}: {
  position: LatLng;
  onChange: (latlng: LatLng) => void;
}) {
  const ref = useRef<L.Marker>(null);
  return (
    <Marker
      ref={ref}
      position={[position.lat, position.lng]}
      icon={violetIcon}
      draggable
      eventHandlers={{
        dragend: () => {
          const m = ref.current;
          if (!m) return;
          const ll = m.getLatLng();
          onChange({ lat: ll.lat, lng: ll.lng });
        },
      }}
    />
  );
}

// ── Search via OpenStreetMap Nominatim ───────────────────────────────

interface NominatimHit {
  display_name: string;
  lat: string;
  lon: string;
}

async function searchPlaces(query: string): Promise<NominatimHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return (await res.json()) as NominatimHit[];
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

// ── Main component ───────────────────────────────────────────────────

export default function LocationPicker({
  value,
  onChange,
  defaultCenter,
  onAddressFound,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Try to seed defaultCenter from browser geolocation if not provided
  const [center, setCenter] = useState<LatLng>(
    defaultCenter ?? { lat: -33.8688, lng: 151.2093 }, // Sydney CBD
  );
  useEffect(() => {
    if (defaultCenter) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      undefined,
      { enableHighAccuracy: false, timeout: 6000 },
    );
  }, [defaultCenter]);

  // When the pin changes, optionally reverse-geocode the address
  useEffect(() => {
    if (!value || !onAddressFound) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const addr = await reverseGeocode(value.lat, value.lng);
      if (!cancelled) onAddressFound(addr);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, onAddressFound]);

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const hits = await searchPlaces(searchQuery.trim());
      setSearchResults(hits);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (hit: NominatimHit) => {
    const ll = { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
    onChange(ll);
    setSearchResults(null);
    setSearchQuery(hit.display_name.split(",")[0] ?? hit.display_name);
  };

  return (
    <div className="space-y-2">
      {/* Search box */}
      <form onSubmit={runSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a place (e.g. UTS Building 6)"
          className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-400/50"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
        <button
          type="submit"
          disabled={searching}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-semibold disabled:opacity-50"
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      {/* Search results dropdown */}
      {searchResults && searchResults.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
          {searchResults.map((hit, i) => (
            <button
              key={`${hit.lat}-${hit.lon}-${i}`}
              type="button"
              onClick={() => pickResult(hit)}
              className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 border-b border-white/5 last:border-b-0"
            >
              <span className="block truncate">{hit.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {searchResults && searchResults.length === 0 && (
        <p className="text-xs text-white/40 text-center py-2">
          No matches. Try a more specific query, or just tap on the map.
        </p>
      )}

      {/* The map */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={15}
          style={{ height: "320px", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            // CartoDB dark tiles — free, OpenStreetMap-based, look like the screenshot
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
            subdomains={["a", "b", "c", "d"]}
            maxZoom={20}
          />
          <FlyTo center={value} />
          <ClickToPin onChange={onChange} />
          {value && <DraggableMarker position={value} onChange={onChange} />}
        </MapContainer>

        {!value && (
          <div className="absolute inset-x-3 bottom-3 bg-black/70 backdrop-blur rounded-xl px-3 py-2 text-center text-xs text-white/80 pointer-events-none">
            Tap anywhere on the map to pin the meetup spot
          </div>
        )}
      </div>

      {/* Coords readout */}
      {value && (
        <p className="text-xs text-white/40 text-center">
          📍 Pinned at {value.lat.toFixed(5)}, {value.lng.toFixed(5)} · drag the marker to fine-tune
        </p>
      )}
    </div>
  );
}
