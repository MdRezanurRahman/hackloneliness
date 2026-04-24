"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_FORM,
  FAITH_CHOICES,
  GENDER_CHOICES,
  VICE_CHOICES,
  WEEKEND_CHOICES,
  INTENT_CHOICES,
  STRESS_CHOICES,
  BARRIER_CHOICES,
  SOCIAL_BATTERY_LABEL,
  calculateAge,
  type OnboardingFormData,
  type FaithOption,
  type GenderOption,
  type ViceOption,
  type WeekendOption,
  type IntentOption,
  type StressOption,
  type BarrierOption,
} from "@/lib/onboarding/form-schema";

// ── Step catalog ─────────────────────────────────────────────────────
type Section = "basics" | "vibe" | "inner";

interface Step {
  id: string;
  section: Section;
}

const STEPS: Step[] = [
  { id: "full_name",       section: "basics" },
  { id: "dob",             section: "basics" },
  { id: "gender",          section: "basics" },
  { id: "education",       section: "basics" },
  { id: "occupation",      section: "basics" },
  { id: "religion",        section: "vibe"   },
  { id: "social_battery",  section: "vibe"   },
  { id: "vices",           section: "vibe"   },
  { id: "ideal_weekend",   section: "vibe"   },
  { id: "intent",          section: "inner"  },
  { id: "stress_handling", section: "inner"  },
  { id: "barrier",         section: "inner"  },
];

const SECTION_META: Record<Section, { label: string; emoji: string }> = {
  basics: { label: "The Basics",   emoji: "📇" },
  vibe:   { label: "The Vibe",     emoji: "🎧" },
  inner:  { label: "Inner State",  emoji: "💭" },
};

// ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already onboarded, bounce to /home
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
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.onboarding_complete) router.replace("/home");
    })();
  }, [router]);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const sectionIndex = useMemo(() => {
    const steps = STEPS.filter((s) => s.section === current.section);
    return {
      total: steps.length,
      index: steps.findIndex((s) => s.id === current.id) + 1,
    };
  }, [current]);

  const isStepValid = (): boolean => {
    switch (current.id) {
      case "full_name":       return form.full_name.trim().length >= 2;
      case "dob":             return (calculateAge(form.dob) ?? 0) >= 13;
      case "gender":          return form.gender !== "";
      case "education":       return form.education.trim().length >= 2;
      case "occupation":      return form.occupation.trim().length >= 2;
      case "religion":        return form.religion !== "";
      case "social_battery":  return form.social_battery >= 1 && form.social_battery <= 5;
      case "vices":           return form.drinking !== "" && form.smoking !== "";
      case "ideal_weekend":   return form.ideal_weekend.length > 0;
      case "intent":          return form.intent !== "";
      case "stress_handling": return form.stress_handling !== "";
      case "barrier":         return form.barrier !== "";
      default:                return false;
    }
  };

  const next = () => {
    if (!isStepValid()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };
  const back = () => step > 0 && setStep(step - 1);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const age = calculateAge(form.dob);
      const firstName = form.full_name.trim().split(/\s+/)[0] || "Friend";

      const { error: upsertErr } = await supabase.from("users").upsert({
        id: user.id,
        display_name: firstName,
        full_name: form.full_name.trim(),
        age,
        gender: form.gender || null,
        onboarding_complete: true,
        onboarding_step: STEPS.length,
        ai_profile: {
          // Basics
          dob: form.dob,
          education: form.education.trim(),
          occupation: form.occupation.trim(),
          // Vibe
          religion: form.religion,
          social_battery: form.social_battery,
          drinking: form.drinking,
          smoking: form.smoking,
          ideal_weekend: form.ideal_weekend,
          // Inner state
          intent: form.intent,
          stress_handling: form.stress_handling,
          barrier: form.barrier,
        },
      });
      if (upsertErr) throw upsertErr;
      router.push("/onboarding/complete");
    } catch (err: unknown) {
      console.error("[onboarding] submit failed:", err);
      let msg = "Something went wrong";
      if (err && typeof err === "object") {
        const e = err as { message?: string; code?: string; hint?: string; details?: string };
        const parts = [e.message, e.code ? `(code: ${e.code})` : null, e.hint, e.details]
          .filter(Boolean);
        if (parts.length) msg = parts.join(" — ");
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setSubmitting(false);
    }
  };

  const sec = SECTION_META[current.section];

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-[100dvh] sm:min-h-0 sm:h-auto sm:my-8">
      {/* Progress bar */}
      <div className="px-5 pt-6 sm:px-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={back}
            disabled={step === 0}
            className="text-white/50 hover:text-white text-sm disabled:opacity-0 transition-opacity"
          >
            ← Back
          </button>
          <span className="text-white/40 text-xs">
            {sec.emoji} {sec.label} · {sectionIndex.index}/{sectionIndex.total}
          </span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-indigo-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-5 sm:px-0 pt-10 pb-6">
        <StepContent step={current.id} form={form} setForm={setForm} />
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-0 pb-8 space-y-3">
        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {error}
          </div>
        )}
        <button
          onClick={next}
          disabled={!isStepValid() || submitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Saving…"
            : step === STEPS.length - 1
            ? "Finish & meet Lyanna"
            : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// STEP CONTENT
// ═════════════════════════════════════════════════════════════════════

function StepContent({
  step,
  form,
  setForm,
}: {
  step: string;
  form: OnboardingFormData;
  setForm: (f: OnboardingFormData) => void;
}) {
  // ── Section A: Basics ──────────────────────────────────────────────
  if (step === "full_name") {
    return (
      <StepLayout eyebrow="👋 Hi there" title="What's your full name?"
        subtitle="This is how others will recognise you at meetups. You can still set a short nickname later.">
        <input
          type="text"
          autoFocus
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="e.g. Sam Taylor"
          className={inputStyle}
        />
      </StepLayout>
    );
  }

  if (step === "dob") {
    return (
      <StepLayout eyebrow="🎂 A quick detail" title="When were you born?"
        subtitle="We use this to keep everyone age-appropriate.">
        <DobPicker value={form.dob} onChange={(dob) => setForm({ ...form, dob })} />
      </StepLayout>
    );
  }

  if (step === "gender") {
    return (
      <StepLayout eyebrow="You" title="How do you identify?"
        subtitle="Pick whichever feels right.">
        <ChipGrid
          options={GENDER_CHOICES}
          value={form.gender ? [form.gender] : []}
          onChange={(vals) => setForm({ ...form, gender: (vals[0] as GenderOption) ?? "" })}
          mode="single"
        />
      </StepLayout>
    );
  }

  if (step === "education") {
    return (
      <StepLayout eyebrow="🎓 Your studies" title="What are you studying?"
        subtitle="e.g. &ldquo;Master of Data Science at UTS&rdquo; — or just your most recent degree.">
        <input
          type="text"
          autoFocus
          value={form.education}
          onChange={(e) => setForm({ ...form, education: e.target.value })}
          placeholder="e.g. Bachelor of Business at USYD"
          className={inputStyle}
        />
        <p className="text-white/40 text-xs mt-2">
          Helps us match you with people in similar programs or career stages.
        </p>
      </StepLayout>
    );
  }

  if (step === "occupation") {
    return (
      <StepLayout eyebrow="💼 Work" title="What do you do?"
        subtitle="Current job or industry. Leave blank if student only.">
        <input
          type="text"
          autoFocus
          value={form.occupation}
          onChange={(e) => setForm({ ...form, occupation: e.target.value })}
          placeholder="e.g. Software engineer at Canva · or &ldquo;Student&rdquo;"
          className={inputStyle}
        />
      </StepLayout>
    );
  }

  // ── Section B: The Vibe ────────────────────────────────────────────
  if (step === "religion") {
    return (
      <StepLayout eyebrow="🕊️ Your values" title="Do you follow a faith or philosophy?"
        subtitle="Lyanna will respect and support whatever you choose — nothing more, nothing less.">
        <ChipGrid
          options={FAITH_CHOICES}
          value={form.religion ? [form.religion] : []}
          onChange={(vals) => setForm({ ...form, religion: (vals[0] as FaithOption) ?? "" })}
          mode="single"
        />
      </StepLayout>
    );
  }

  if (step === "social_battery") {
    return (
      <StepLayout eyebrow="🔋 Social battery" title="How do you show up socially?"
        subtitle="There's no right answer. This just helps us match the right kind of meetup to you.">
        <SocialBatterySlider
          value={form.social_battery}
          onChange={(v) => setForm({ ...form, social_battery: v })}
        />
      </StepLayout>
    );
  }

  if (step === "vices") {
    return (
      <StepLayout eyebrow="🍷 Preferences" title="Drinking & smoking?"
        subtitle="Just so matches line up with your lifestyle.">
        <div className="space-y-5">
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
      </StepLayout>
    );
  }

  if (step === "ideal_weekend") {
    return (
      <StepLayout eyebrow="🎉 Ideal weekend" title="How do you recharge?"
        subtitle="Pick everything that fits — we'll match meetups to your vibe.">
        <ChipGrid
          options={WEEKEND_CHOICES}
          value={form.ideal_weekend}
          onChange={(vals) => setForm({ ...form, ideal_weekend: vals as WeekendOption[] })}
          mode="multi"
        />
      </StepLayout>
    );
  }

  // ── Section C: Inner State ─────────────────────────────────────────
  if (step === "intent") {
    return (
      <StepLayout eyebrow="💭 Being honest helps" title="What brings you here today?"
        subtitle="Whatever it is, you're not alone in it. This stays private.">
        <ChipGrid
          options={INTENT_CHOICES}
          value={form.intent ? [form.intent] : []}
          onChange={(vals) => setForm({ ...form, intent: (vals[0] as IntentOption) ?? "" })}
          mode="single"
          columns={1}
        />
      </StepLayout>
    );
  }

  if (step === "stress_handling") {
    return (
      <StepLayout eyebrow="🌊 Under pressure" title="How do you usually handle stress?"
        subtitle="Lyanna uses this to know when to nudge and when to back off.">
        <ChipGrid
          options={STRESS_CHOICES}
          value={form.stress_handling ? [form.stress_handling] : []}
          onChange={(vals) => setForm({ ...form, stress_handling: (vals[0] as StressOption) ?? "" })}
          mode="single"
          columns={1}
        />
      </StepLayout>
    );
  }

  if (step === "barrier") {
    return (
      <StepLayout eyebrow="🚧 The real obstacle" title="What's your biggest barrier to meeting people right now?"
        subtitle="We'll design the rest of your experience around this.">
        <ChipGrid
          options={BARRIER_CHOICES}
          value={form.barrier ? [form.barrier] : []}
          onChange={(vals) => setForm({ ...form, barrier: (vals[0] as BarrierOption) ?? "" })}
          mode="single"
          columns={1}
        />
      </StepLayout>
    );
  }

  return null;
}

// ═════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═════════════════════════════════════════════════════════════════════

const inputStyle =
  "w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder-white/30 focus:outline-none focus:border-violet-400/50 focus:bg-white/[0.07]";

function StepLayout({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {eyebrow && <p className="text-violet-300 text-sm font-medium mb-2">{eyebrow}</p>}
      <h2 className="text-white text-2xl sm:text-3xl font-semibold leading-tight mb-2">
        {title}
      </h2>
      {subtitle && <p className="text-white/50 text-sm mb-6">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ChipGrid<T extends string>({
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

function VicePicker({
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

function SocialBatterySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="relative py-6">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-violet-400 h-2"
        />
        <div className="flex justify-between text-[10px] text-white/40 mt-2 px-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n === value ? "text-violet-300 font-semibold" : ""}>•</span>
          ))}
        </div>
      </div>
      <div className="text-center mt-2">
        <p className="text-violet-200 font-semibold">{SOCIAL_BATTERY_LABEL(value)}</p>
        <p className="text-white/40 text-xs mt-1">
          Quiet ← 1 · 2 · 3 · 4 · 5 → Life of the party
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// DobPicker — three dropdowns (month/day/year)
// ─────────────────────────────────────────────────────────────────────
function DobPicker({
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
