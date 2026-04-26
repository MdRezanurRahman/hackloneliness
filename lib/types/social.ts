// Types for the social feature tables (posts, activities, chat, etc.)
// Kept separate from database.ts so we can evolve them quickly.

export type PostType = "text" | "image" | "video";

export interface PostRow {
  id: string;
  created_at: string;
  user_id: string;
  post_type: PostType;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  like_count: number;
  comment_count: number;
}

export interface PostWithAuthor extends PostRow {
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  liked_by_me?: boolean;
}

export interface ActivityRow {
  id: string;
  created_at: string;
  host_id: string;
  title: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  address_label: string | null;
  city: string | null;
  starts_at: string;
  duration_mins: number;
  max_attendees: number;
  current_count: number;
  status: "open" | "full" | "cancelled" | "completed";
}

export interface ActivityWithHost extends ActivityRow {
  host: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    reputation_score: number;
  };
}

/** Row shape returned by the `nearby_activities` RPC. Flat columns — the RPC
 *  denormalizes host fields so we get activity + host + distance in one call. */
export interface NearbyActivityRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  address_label: string | null;
  city: string | null;
  starts_at: string;
  duration_mins: number;
  max_attendees: number;
  current_count: number;
  status: "open" | "full" | "cancelled" | "completed";
  latitude: number | null;
  longitude: number | null;
  host_id: string;
  host_display_name: string;
  host_avatar_url: string | null;
  host_reputation_score: number;
  distance_m: number;
}

export interface VerificationLogRow {
  id: string;
  created_at: string;
  activity_id: string | null;
  initiator_id: string;
  verifier_id: string | null;
  qr_token: string;
  token_expires_at: string;
  verified_at: string | null;
  status: "pending" | "verified" | "expired" | "rejected";
}

export interface ReputationReviewRow {
  id: string;
  created_at: string;
  activity_id: string | null;
  reviewer_id: string;
  reviewee_id: string;
  overall_score: number;
  safety_score: number;
  comment: string | null;
}

export interface ConversationRow {
  id: string;
  created_at: string;
  last_message_at: string;
  last_message_preview: string | null;
}

export interface ConversationSummary extends ConversationRow {
  other_user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  unread_count?: number;
}

export interface MessageRow {
  id: string;
  created_at: string;
  conversation_id: string;
  sender_id: string;
  text: string;
}

export const ACTIVITY_CATEGORIES = [
  { value: "coffee",    label: "Coffee",    icon: "☕" },
  { value: "chill",     label: "Chill",     icon: "🍵" },
  { value: "walk",      label: "Walk",      icon: "🚶" },
  { value: "study",     label: "Study",     icon: "📚" },
  { value: "sport",     label: "Sport",     icon: "⚽" },
  { value: "food",      label: "Food",      icon: "🍜" },
  { value: "art",       label: "Art",       icon: "🎨" },
  { value: "music",     label: "Music",     icon: "🎵" },
  { value: "movie",     label: "Movie",     icon: "🎬" },
  { value: "gaming",    label: "Gaming",    icon: "🎮" },
  { value: "nightlife", label: "Nightlife", icon: "🪩" },
  { value: "other",     label: "Other",     icon: "✨" },
] as const;
