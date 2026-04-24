"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_FORM,
  FAITH_CHOICES,
  FEELING_CHOICES,
  GENDER_CHOICES,
  GOAL_CHOICES,
  calculateAge,
  type OnboardingFormData,
  type FaithOption,
  type GenderOption,
  type FeelingOption,
  type GoalOption,
} from "@/lib/onboarding/form-schema";

const STEPS = [
  "name",
  "dob",
  "gender",
  "religion",
  "height",
  "feelings",
  "goals",
] as const;

type StepId = typeof STEPS[number];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already onboarded, jump straight to /home
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

  const currentStep: StepId = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case "name": return form.display_name.trim().length >= 2;
      case "dob": return (calculateAge(form.dob) ?? 0) >= 13;
      case "gender": return form.gender !== "";
      case "religion": return form.religion !== "";
      case "height": return true;                          // optional
      case "feelings": return form.feelings.length > 0;
      case "goals": return form.goals.length > 0;
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
      const { error: upsertErr } = await supabase.from("users").upsert({
        id: user.id,
        display_name: form.display_name.trim(),
        age,
        gender: form.gender || null,
        onboarding_complete: true,
        onboarding_step: STEPS.length,
        ai_profile: {
          dob: form.dob,
          religion: form.religion,
          height_cm: form.height_cm,
          emotional_state: form.feelings,
          goals: form.goals,
        },
      });
      if (upsertErr) throw upsertErr;
      router.push("/onboarding/complete");
    } catch (err: unknown) {
      // Supabase's PostgrestError isn't an Error instance — extract fields manually
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
            Step {step + 1} of {STEPS.length}
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
        <StepContent step={currentStep} form={form} setForm={setForm} />
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

// ─────────────────────────────────────────────────────────────────────
// Step renderer
// ─────────────────────────────────────────────────────────────────────
function StepContent({
  step,
  form,
  setForm,
}: {
  step: StepId;
  form: OnboardingFormData;
  setForm: (f: OnboardingFormData) => void;
}) {
  if (step === "name") {
    return (
      <StepLayout
        eyebrow="👋 Hi there"
        title="What should we call you?"
        subtitle="Just a first name works. You can change this later."
      >
        <input
          type="text"
          autoFocus
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          placeholder="e.g. Sam"
          className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder-white/30 focus:outline-none focus:border-violet-400/50 focus:bg-white/[0.07]"
        />
      </StepLayout>
    );
  }

  if (step === "dob") {
    return (
      <StepLayout
        eyebrow="🎂 A quick detail"
        title="When were you born?"
        subtitle="We use this to keep everyone age-appropriate."
      >
        <DobPicker value={form.dob} onChange={(dob) => setForm({ ...form, dob })} />
      </StepLayout>
    );
  }

  if (step === "gender") {
    return (
      <StepLayout
        eyebrow="You"
        title="How do you identify?"
        subtitle="Pick whichever feels right."
      >
        <ChipGrid
          options={GENDER_CHOICES}
          value={form.gender ? [form.gender] : []}
          onChange={(vals) => setForm({ ...form, gender: (vals[0] as GenderOption) ?? "" })}
          mode="single"
        />
      </StepLayout>
    );
  }

  if (step === "religion") {
    return (
      <StepLayout
        eyebrow="🕊️ Your values"
        title="Do you follow a faith or philosophy?"
        subtitle="Lyanna will respect and support whatever you choose — nothing more, nothing less."
      >
        <ChipGrid
          options={FAITH_CHOICES}
          value={form.religion ? [form.religion] : []}
          onChange={(vals) => setForm({ ...form, religion: (vals[0] as FaithOption) ?? "" })}
          mode="single"
        />
      </StepLayout>
    );
  }

  if (step === "height") {
    return (
      <StepLayout
        eyebrow="📏 Optional"
        title="How tall are you?"
        subtitle="Feel free to skip — only matters for certain activities like pickup games."
      >
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={100}
            max={230}
            value={form.height_cm ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                height_cm: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="Height in cm"
            className="flex-1 px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder-white/30 focus:outline-none focus:border-violet-400/50"
          />
          <span className="text-white/50 text-sm">cm</span>
        </div>
      </StepLayout>
    );
  }

  if (step === "feelings") {
    return (
      <StepLayout
        eyebrow="💭 No wrong answers"
        title="How are you feeling lately?"
        subtitle="Pick any that fit — multiple is fine."
      >
        <ChipGrid
          options={FEELING_CHOICES}
          value={form.feelings}
          onChange={(vals) => setForm({ ...form, feelings: vals as FeelingOption[] })}
          mode="multi"
        />
      </StepLayout>
    );
  }

  if (step === "goals") {
    return (
      <StepLayout
        eyebrow="🎯 Almost done"
        title="What brings you here?"
        subtitle="Pick what you're hoping to find."
      >
        <ChipGrid
          options={GOAL_CHOICES}
          value={form.goals}
          onChange={(vals) => setForm({ ...form, goals: vals as GoalOption[] })}
          mode="multi"
        />
      </StepLayout>
    );
  }

  return null;
}

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

// ─────────────────────────────────────────────────────────────────────
// DobPicker — three dropdowns (month/day/year), avoids <input type="date">
// quirks where typing "1996" gets auto-truncated to "0006" on some browsers.
// ─────────────────────────────────────────────────────────────────────
function DobPicker({
  value,
  onChange,
}: {
  value: string;                              // ISO YYYY-MM-DD or ""
  onChange: (v: string) => void;
}) {
  // Local state so partial selections (just month, just year) persist.
  // Seed from the parent value only once — any ISO date in the parent gets split.
  const initial = useMemo(() => {
    const parts = value ? value.split("-") : [];
    return {
      y: parts[0] ?? "",
      m: parts[1] ? String(Number(parts[1])) : "",   // strip leading zero
      d: parts[2] ? String(Number(parts[2])) : "",
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [y, setY] = useState(initial.y);
  const [m, setM] = useState(initial.m);
  const [d, setD] = useState(initial.d);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 88 }, (_, i) => currentYear - 13 - i); // 13-100 yrs old
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

  // Whenever any part changes, only push a complete ISO string to the parent.
  // Keep empty string while any part is missing (so isStepValid() stays false).
  useEffect(() => {
    if (!y || !m || !d) {
      onChange("");
      return;
    }
    const maxD = daysInMonth(y, m);
    const safeDay = Math.min(Number(d), maxD).toString().padStart(2, "0");
    onChange(`${y}-${m.padStart(2, "0")}-${safeDay}`);
    // Clamp the local day too, so the Day select reflects the clamped value
    if (Number(d) > maxD) setD(String(maxD));
  }, [y, m, d, onChange]);

  const selectClass =
    "w-full px-3 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-base focus:outline-none focus:border-violet-400/50 appearance-none [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22white%22 opacity=%220.5%22><path d=%22M5.25 7.5l4.75 5 4.75-5%22 stroke=%22white%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')] bg-[length:14px_14px] bg-[right_12px_center] bg-no-repeat pr-9";

  const age = calculateAge(value);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-white/40 text-xs mb-1.5 ml-1">Month</label>
          <select
            value={m}
            onChange={(e) => setM(e.target.value)}
            className={selectClass}
          >
            <option value="" className="bg-slate-900">—</option>
            {months.map((name, i) => (
              <option key={name} value={String(i + 1)} className="bg-slate-900">
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-white/40 text-xs mb-1.5 ml-1">Day</label>
          <select
            value={d}
            onChange={(e) => setD(e.target.value)}
            className={selectClass}
          >
            <option value="" className="bg-slate-900">—</option>
            {days.map((n) => (
              <option key={n} value={String(n)} className="bg-slate-900">
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-white/40 text-xs mb-1.5 ml-1">Year</label>
          <select
            value={y}
            onChange={(e) => setY(e.target.value)}
            className={selectClass}
          >
            <option value="" className="bg-slate-900">—</option>
            {years.map((yr) => (
              <option key={yr} value={String(yr)} className="bg-slate-900">
                {yr}
              </option>
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

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
  mode,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  mode: "single" | "multi";
}) {
  const toggle = (v: T) => {
    if (mode === "single") {
      onChange([v]);
      return;
    }
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  return (
    <div className="grid grid-cols-2 gap-2.5">
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
