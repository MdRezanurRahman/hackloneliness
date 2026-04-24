-- Phase 1 expansion:
--   (a) Posts → Echoes: text, image, video
--   (b) Users: add full_name (Basics section needs real name separately from display_name)
-- Safe to re-run.

-- ============================================================
-- POSTS → ECHOES (text | image | video)
-- ============================================================

-- 1. Add type discriminator and video URL
alter table public.posts
  add column if not exists post_type text not null default 'image';

alter table public.posts
  drop constraint if exists posts_type_check;

alter table public.posts
  add constraint posts_type_check
    check (post_type in ('text', 'image', 'video'));

alter table public.posts
  add column if not exists video_url text;

-- 2. image_url must become nullable (text/video posts have none)
alter table public.posts
  alter column image_url drop not null;

-- 3. Integrity: each row must have exactly the content its type implies
alter table public.posts
  drop constraint if exists posts_content_matches_type;

alter table public.posts
  add constraint posts_content_matches_type check (
    (post_type = 'text'  and image_url is null and video_url is null
                          and caption is not null and char_length(caption) > 0)
    or (post_type = 'image' and image_url is not null)
    or (post_type = 'video' and video_url is not null)
  );

-- ============================================================
-- STORAGE BUCKET UPDATES (photos bucket now also accepts video)
-- ============================================================
-- 50 MB limit matches the UX cap. Allowed MIME types cover the common
-- image formats + mp4, webm, and mov (iPhone default).

update storage.buckets
set
  file_size_limit      = 52428800,                    -- 50 MB
  allowed_mime_types   = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
where id = 'photos';

-- RLS policies on storage.objects remain the same (public read, auth upload,
-- owner delete). They already cover both image and video objects.

-- ============================================================
-- USERS: deeper onboarding profile
-- ============================================================
-- full_name (Section A) stored as its own column for easy search/moderation.
-- Everything else (education, occupation, social_battery, drinking, smoking,
-- ideal_weekend[], intent, stress_handling, barrier) lives inside
-- users.ai_profile JSONB so we can iterate without migrations.

alter table public.users
  add column if not exists full_name text;

-- Helpful partial index if we later want to search by full_name
create index if not exists users_full_name_idx
  on public.users (lower(full_name))
  where full_name is not null;
