"use client";

/**
 * Shared form primitives used by both the onboarding flow and the
 * edit-profile page. Keeping them in one place so chip styles, slider
 * behavior, and the DobPicker bug-fix stay in sync across surfaces.
 */

import { useEffect, useMemo, useState } from "react";
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

export function ChipGrid<T extends string>({
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
  const toggle = (v: T) => {
    if (mode === "single") {
      onChange([v]);
      return;
    }
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
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

// ─── Vice picker (drinking / smoking) ────────────────────────────────

export function VicePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ViceOption | "";
  onChange: (v: ViceOption) => void;
}) {
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
              onClick={() => onChange(c.value)}
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
}

// ─── Social battery slider (1–5) ─────────────────────────────────────

export function SocialBatterySlider({
  value,
  onChange,
  showLabel = true,
}: {
  value: number;
  onChange: (v: number) => void;
  showLabel?: boolean;
}) {
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
          onChange={(e) => onChange(Number(e.target.value))}
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
}

// ─── DOB picker (month / day / year dropdowns) ───────────────────────
// Avoids the `<input type="date">` truncation bug. Keeps its own internal
// y/m/d state so partial selections persist; emits ISO YYYY-MM-DD upstream
// only when all three are filled.

export function DobPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
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

  useEffect(() => {
    if (!y || !m || !d) {
      onChange("");
      return;
    }
    const maxD = daysInMonth(y, m);
    const safeDay = Math.min(Number(d), maxD).toString().padStart(2, "0");
    onChange(`${y}-${m.padStart(2, "0")}-${safeDay}`);
    if (Number(d) > maxD) setD(String(maxD));
  }, [y, m, d, onChange]);

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
}
