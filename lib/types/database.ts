export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      activities: {
        Row: ActivityRow;
        Insert: ActivityInsert;
        Update: ActivityUpdate;
      };
      activity_attendees: {
        Row: ActivityAttendeeRow;
        Insert: ActivityAttendeeInsert;
        Update: ActivityAttendeeUpdate;
      };
      verification_logs: {
        Row: VerificationLogRow;
        Insert: VerificationLogInsert;
        Update: VerificationLogUpdate;
      };
      reputation_reviews: {
        Row: ReputationReviewRow;
        Insert: ReputationReviewInsert;
        Update: never;
      };
      ai_sessions: {
        Row: AiSessionRow;
        Insert: AiSessionInsert;
        Update: AiSessionUpdate;
      };
    };
  };
}

// ── Users ──────────────────────────────────────────────────────────────────

export interface AiProfile {
  emotional_state?: string;
  loneliness_score?: number;        // 0-10
  interests?: string[];
  goals?: string[];
  personality_traits?: string[];
  conversation_summary?: string;
}

export interface UserRow {
  id: string;
  created_at: string;
  updated_at: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  gender: string | null;
  location: unknown | null;         // PostGIS geography
  city: string | null;
  country_code: string | null;
  ai_profile: AiProfile;
  reputation_score: number;
  safety_score: number;
  verified_id: boolean;
  verification_tier: "none" | "email" | "phone" | "id";
  is_banned: boolean;
  onboarding_complete: boolean;
  onboarding_step: number;
}

export type UserInsert = Omit<UserRow, "created_at" | "updated_at" | "reputation_score" | "safety_score"> & {
  reputation_score?: number;
  safety_score?: number;
};

export type UserUpdate = Partial<Omit<UserRow, "id" | "created_at">>;

// ── Activities ─────────────────────────────────────────────────────────────

export interface ActivityRow {
  id: string;
  created_at: string;
  updated_at: string;
  host_id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  location: unknown;
  address_label: string | null;
  city: string | null;
  country_code: string | null;
  starts_at: string;
  ends_at: string | null;
  duration_mins: number | null;
  max_attendees: number;
  current_count: number;
  min_reputation: number;
  verified_only: boolean;
  status: "open" | "full" | "cancelled" | "completed";
}

export type ActivityInsert = Omit<ActivityRow, "id" | "created_at" | "updated_at" | "current_count"> & {
  current_count?: number;
};

export type ActivityUpdate = Partial<Omit<ActivityRow, "id" | "created_at" | "host_id">>;

// ── Activity Attendees ─────────────────────────────────────────────────────

export interface ActivityAttendeeRow {
  activity_id: string;
  user_id: string;
  joined_at: string;
  status: "pending" | "confirmed" | "cancelled" | "no_show";
}

export type ActivityAttendeeInsert = Omit<ActivityAttendeeRow, "joined_at"> & { joined_at?: string };
export type ActivityAttendeeUpdate = Pick<ActivityAttendeeRow, "status">;

// ── Verification Logs ──────────────────────────────────────────────────────

export interface VerificationLogRow {
  id: string;
  created_at: string;
  activity_id: string | null;
  initiator_id: string;
  verifier_id: string;
  qr_token: string;
  token_expires_at: string;
  verified_at: string | null;
  initiator_location: unknown | null;
  verifier_location: unknown | null;
  distance_meters: number | null;
  status: "pending" | "verified" | "expired" | "rejected";
}

export type VerificationLogInsert = Pick<VerificationLogRow, "activity_id" | "initiator_id" | "verifier_id" | "qr_token"> & {
  token_expires_at?: string;
  initiator_location?: unknown;
};

export type VerificationLogUpdate = Partial<Pick<VerificationLogRow, "status" | "verified_at" | "verifier_location" | "distance_meters">>;

// ── Reputation Reviews ─────────────────────────────────────────────────────

export interface ReputationReviewRow {
  id: string;
  created_at: string;
  activity_id: string | null;
  reviewer_id: string;
  reviewee_id: string;
  overall_score: number;
  safety_score: number;
  comment: string | null;
  flags: string[];
}

export type ReputationReviewInsert = Omit<ReputationReviewRow, "id" | "created_at">;

// ── AI Sessions ────────────────────────────────────────────────────────────

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiSessionInsights {
  emotional_state?: string;
  loneliness_score?: number;
  interests?: string[];
  goals?: string[];
  personality_summary?: string;
  ready_for_activities?: boolean;
}

export interface AiSessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  session_type: "onboarding" | "daily_checkin" | "activity_prep" | "post_meetup";
  messages: ClaudeMessage[];
  insights: AiSessionInsights;
  completed_at: string | null;
}

export type AiSessionInsert = Omit<AiSessionRow, "id" | "created_at" | "updated_at" | "completed_at"> & {
  completed_at?: string;
};

export type AiSessionUpdate = Partial<Pick<AiSessionRow, "messages" | "insights" | "completed_at">>;
