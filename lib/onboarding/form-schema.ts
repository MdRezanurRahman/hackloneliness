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

export interface OnboardingFormData {
  display_name: string;
  dob: string;                     // YYYY-MM-DD
  gender: GenderOption | "";
  religion: FaithOption | "";
  height_cm: number | null;
  feelings: FeelingOption[];
  goals: GoalOption[];
}

export const EMPTY_FORM: OnboardingFormData = {
  display_name: "",
  dob: "",
  gender: "",
  religion: "",
  height_cm: null,
  feelings: [],
  goals: [],
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
