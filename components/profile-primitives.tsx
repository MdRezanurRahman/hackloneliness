"use client";

/**
 * Shared form primitives used by both the onboarding flow and the
 * edit-profile page. Keeping them in one place so chip styles, slider
 * behavior, and the DobPicker bug-fix stay in sync across surfaces.
 */

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  VICE_CHOICES,
  calculateAge,
  type ViceOption,
} from "@/lib/onboarding/form-schema";

// ─── Styles shared by text inputs ─────────────────────────────────────

export const INPUT_STYLE =
  "w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:border-violet-400/50 focus:bg-white/[0.07]";

export const INPUT_STYLE_LARGE =
  "w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder-white/30 focus:outline-none focus:border-violet-400/50 focus:bg-white/[0.07]";

// ─── Chip grid (single or multi select) ──────────────────────────────

function ChipGridImpl<T extends string>({
  options,
  value,
  onChange,
  mode,
  columns = 2,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  mode: "single" | "multi";
  columns?: 1 | 2;
}) {
  // Keep a ref to the latest onChange so memoization isn't broken by
  // callers passing a fresh arrow-function each render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const toggle = (v: T) => {
    if (mode === "single") {
      onChangeRef.current([v]);
      return;
    }
    if (value.includes(v)) onChangeRef.current(value.filter((x) => x !== v));
    else onChangeRef.current([...value, v]);
  };

  const gridCls = columns === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className={`grid ${gridCls} gap-2.5`}>
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            type="button"
            className={`px-4 py-3.5 rounded-2xl border text-left text-sm font-medium transition-all active:scale-[0.98] ${
              active
                ? "bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border-violet-400 text-white"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {opt.icon && <span className="mr-2">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Memoize — re-render only when options/value/mode/columns change.
// onChange changes are absorbed via the ref inside ChipGridImpl.
export const ChipGrid = memo(ChipGridImpl, (prev, next) => {
  return (
    prev.options === next.options &&
    prev.mode === next.mode &&
    prev.columns === next.columns &&
    prev.value.length === next.value.length &&
    prev.value.every((v, i) => v === next.value[i])
  );
}) as typeof ChipGridImpl;

// ─── Vice picker (drinking / smoking) ────────────────────────────────

export const VicePicker = memo(function VicePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ViceOption | "";
  onChange: (v: ViceOption) => void;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  return (
    <div>
      <p className="text-white/70 text-sm font-medium mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {VICE_CHOICES.map((c) => {
          const active = value === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChangeRef.current(c.value)}
              className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-[0.98] ${
                active
                  ? "bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border-violet-400 text-white"
                  : "bg-white/5 border-white/10 text-white/70"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}, (prev, next) => prev.label === next.label && prev.value === next.value);

// ─── Social battery slider (1–5) ─────────────────────────────────────

export const SocialBatterySlider = memo(function SocialBatterySlider({
  value,
  onChange,
  showLabel = true,
}: {
  value: number;
  onChange: (v: number) => void;
  showLabel?: boolean;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const labelFor = (v: number) => {
    if (v <= 1) return "Quiet · I recharge alone";
    if (v === 2) return "Reserved · small groups";
    if (v === 3) return "Balanced · some of both";
    if (v === 4) return "Outgoing · love a crowd";
    return "Life of the party";
  };

  return (
    <div>
      <div className="relative py-4">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChangeRef.current(Number(e.target.value))}
          className="w-full accent-violet-400 h-2"
        />
        <div className="flex justify-between text-[10px] text-white/40 mt-1 px-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n === value ? "text-violet-300 font-semibold" : ""}>•</span>
          ))}
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <p className="text-violet-200 font-semibold text-sm">{labelFor(value)}</p>
          <p className="text-white/40 text-xs mt-1">
            Quiet ← 1 · 2 · 3 · 4 · 5 → Life of the party
          </p>
        </div>
      )}
    </div>
  );
}, (prev, next) => prev.value === next.value && prev.showLabel === next.showLabel);

// ─── DOB picker (month / day / year dropdowns) ───────────────────────
// Avoids the `<input type="date">` truncation bug. Keeps its own internal
// y/m/d state so partial selections persist; emits ISO YYYY-MM-DD upstream
// only when all three are filled.

export const DobPicker = memo(function DobPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // ── Critical: stabilize onChange via ref ──────────────────────────
  // Without this, every parent re-render creates a new onChange arrow,
  // which fires this component's useEffect, which calls onChange, which
  // causes the parent to re-render, which creates a new onChange …
  // → input lag / dropped keystrokes on pages with DobPicker always mounted.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const initial = useMemo(() => {
    const parts = value ? value.split("-") : [];
    return {
      y: parts[0] ?? "",
      m: parts[1] ? String(Number(parts[1])) : "",
      d: parts[2] ? String(Number(parts[2])) : "",
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [y, setY] = useState(initial.y);
  const [m, setM] = useState(initial.m);
  const [d, setD] = useState(initial.d);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 88 }, (_, i) => currentYear - 13 - i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysInMonth = (year: string, month: string): number => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  };
  const maxDay = daysInMonth(y, m);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  // Track the last-emitted ISO to avoid emitting the same value repeatedly
  const lastEmitted = useRef<string>("");

  useEffect(() => {
    let next: string;
    if (!y || !m || !d) {
      next = "";
    } else {
      const maxD = daysInMonth(y, m);
      const safeDay = Math.min(Number(d), maxD).toString().padStart(2, "0");
      next = `${y}-${m.padStart(2, "0")}-${safeDay}`;
      if (Number(d) > maxD) setD(String(maxD));
    }
    if (next !== lastEmitted.current) {
      lastEmitted.current = next;
      onChangeRef.current(next);
    }
  }, [y, m, d]);

  const selectClass =
    "w-full px-3 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-base focus:outline-none focus:border-violet-400/50 appearance-none";

  const age = calculateAge(value);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-white/40 text-xs mb-1.5 ml-1">Month</label>
          <select value={m} onChange={(e) => setM(e.target.value)} className={selectClass}>
            <option value="" className="bg-slate-900">—</option>
            {months.map((name, i) => (
              <option key={name} value={String(i + 1)} className="bg-slate-900">{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-white/40 text-xs mb-1.5 ml-1">Day</label>
          <select value={d} onChange={(e) => setD(e.target.value)} className={selectClass}>
            <option value="" className="bg-slate-900">—</option>
            {days.map((n) => (
              <option key={n} value={String(n)} className="bg-slate-900">{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-white/40 text-xs mb-1.5 ml-1">Year</label>
          <select value={y} onChange={(e) => setY(e.target.value)} className={selectClass}>
            <option value="" className="bg-slate-900">—</option>
            {years.map((yr) => (
              <option key={yr} value={String(yr)} className="bg-slate-900">{yr}</option>
            ))}
          </select>
        </div>
      </div>
      {age !== null && age > 0 && (
        <p className="text-white/50 text-sm">
          {age >= 13 ? `You're ${age} — welcome.` : "You must be 13 or older to join."}
        </p>
      )}
    </div>
  );
}, (prev, next) => prev.value === next.value);
