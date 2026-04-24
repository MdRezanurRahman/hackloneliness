export type FaithOption =
  | "muslim"
  | "christian"
  | "hindu"
  | "buddhist"
  | "jewish"
  | "sikh"
  | "atheist"
  | "agnostic"
  | "spiritual"
  | "other"
  | "prefer_not";

export type GenderOption = "woman" | "man" | "non_binary" | "other" | "prefer_not";

export type FeelingOption =
  | "lonely"
  | "anxious"
  | "hopeful"
  | "tired"
  | "okay"
  | "struggling"
  | "homesick"
  | "excited";

export type GoalOption =
  | "deep_friendships"
  | "casual_hangouts"
  | "study_partners"
  | "activity_buddies"
  | "professional_network"
  | "dating"
  | "faith_community";

// ─── Hinge-style deep onboarding types (Phase 1 expansion) ────────────

export type ViceOption =
  | "never"
  | "sometimes"
  | "regularly"
  | "prefer_not";

export type WeekendOption =
  | "clubbing"
  | "cafe_hopping"
  | "gaming"
  | "outdoor_adventures"
  | "deep_conversations"
  | "art_museums"
  | "cozy_at_home";

export type IntentOption =
  | "new_city"
  | "breakup"
  | "gym_buddy"
  | "just_chat";

export type StressOption =
  | "isolating"
  | "friends"
  | "exercise"
  | "creative";

export type BarrierOption =
  | "social_anxiety"
  | "busy"
  | "dont_know_where"
  | "language_barrier";

export interface OnboardingFormData {
  // Section A — Basics
  full_name: string;
  dob: string;                     // YYYY-MM-DD
  gender: GenderOption | "";
  education: string;               // free text: "Master of Data Science at UTS"
  occupation: string;              // free text: "Software engineer at Canva"

  // Section B — The Vibe
  religion: FaithOption | "";
  social_battery: number;          // 1–5 (1 = quiet, 5 = life of the party)
  drinking: ViceOption | "";
  smoking: ViceOption | "";
  ideal_weekend: WeekendOption[];

  // Section C — The Inner State
  intent: IntentOption | "";
  stress_handling: StressOption | "";
  barrier: BarrierOption | "";
}

export const EMPTY_FORM: OnboardingFormData = {
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

export const FAITH_CHOICES: { value: FaithOption; label: string; icon: string }[] = [
  { value: "muslim", label: "Muslim", icon: "☪️" },
  { value: "christian", label: "Christian", icon: "✝️" },
  { value: "hindu", label: "Hindu", icon: "🕉️" },
  { value: "buddhist", label: "Buddhist", icon: "☸️" },
  { value: "jewish", label: "Jewish", icon: "✡️" },
  { value: "sikh", label: "Sikh", icon: "🪯" },
  { value: "spiritual", label: "Spiritual", icon: "✨" },
  { value: "atheist", label: "Atheist", icon: "🔬" },
  { value: "agnostic", label: "Agnostic", icon: "🤔" },
  { value: "other", label: "Other", icon: "🌿" },
  { value: "prefer_not", label: "Prefer not to say", icon: "🙈" },
];

export const GENDER_CHOICES: { value: GenderOption; label: string }[] = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export const FEELING_CHOICES: { value: FeelingOption; label: string; icon: string }[] = [
  { value: "lonely", label: "Lonely", icon: "🌙" },
  { value: "anxious", label: "Anxious", icon: "😟" },
  { value: "homesick", label: "Homesick", icon: "🏠" },
  { value: "tired", label: "Tired", icon: "😮‍💨" },
  { value: "struggling", label: "Struggling", icon: "🌧️" },
  { value: "okay", label: "Okay", icon: "🙂" },
  { value: "hopeful", label: "Hopeful", icon: "🌱" },
  { value: "excited", label: "Excited", icon: "✨" },
];

export const GOAL_CHOICES: { value: GoalOption; label: string; icon: string }[] = [
  { value: "deep_friendships", label: "Deep friendships", icon: "💜" },
  { value: "casual_hangouts", label: "Casual hangouts", icon: "☕" },
  { value: "activity_buddies", label: "Activity buddies", icon: "🎯" },
  { value: "study_partners", label: "Study partners", icon: "📚" },
  { value: "professional_network", label: "Professional network", icon: "💼" },
  { value: "faith_community", label: "Faith community", icon: "🕊️" },
  { value: "dating", label: "Dating", icon: "💫" },
];

// ─── Hinge-style option lists ─────────────────────────────────────────

export const VICE_CHOICES: { value: ViceOption; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "sometimes", label: "Sometimes" },
  { value: "regularly", label: "Regularly" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export const WEEKEND_CHOICES: { value: WeekendOption; label: string; icon: string }[] = [
  { value: "clubbing", label: "Clubbing", icon: "🪩" },
  { value: "cafe_hopping", label: "Café hopping", icon: "☕" },
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "outdoor_adventures", label: "Outdoor adventures", icon: "🏞️" },
  { value: "deep_conversations", label: "Deep conversations", icon: "💬" },
  { value: "art_museums", label: "Art & museums", icon: "🎨" },
  { value: "cozy_at_home", label: "Cozy at home", icon: "🛋️" },
];

export const INTENT_CHOICES: { value: IntentOption; label: string; icon: string }[] = [
  { value: "new_city",  label: "Feeling isolated in a new city", icon: "🧳" },
  { value: "breakup",   label: "Going through a breakup",        icon: "💔" },
  { value: "gym_buddy", label: "Need a gym / hobby buddy",       icon: "🏋️" },
  { value: "just_chat", label: "Just bored and want to chat",    icon: "💭" },
];

export const STRESS_CHOICES: { value: StressOption; label: string; icon: string }[] = [
  { value: "isolating", label: "Isolating myself",   icon: "🌙" },
  { value: "friends",   label: "Talking to friends", icon: "🤝" },
  { value: "exercise",  label: "Physical exercise",  icon: "🏃" },
  { value: "creative",  label: "Creative hobbies",   icon: "🎨" },
];

export const BARRIER_CHOICES: { value: BarrierOption; label: string; icon: string }[] = [
  { value: "social_anxiety",   label: "Social anxiety",               icon: "😟" },
  { value: "busy",             label: "Too busy with work / studies", icon: "⏰" },
  { value: "dont_know_where",  label: "Don't know where to go",       icon: "🗺️" },
  { value: "language_barrier", label: "Language / cultural barriers", icon: "🌏" },
];

export const SOCIAL_BATTERY_LABEL = (value: number): string => {
  if (value <= 1) return "Quiet · I recharge alone";
  if (value === 2) return "Reserved · small groups";
  if (value === 3) return "Balanced · some of both";
  if (value === 4) return "Outgoing · love a crowd";
  return "Life of the party";
};

export function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
