-- Social features: posts, activities, QR verification, reputation, chat.
-- Run this AFTER 000_minimal_users.sql.
-- Safely re-runnable — every drop has `if exists`.

create extension if not exists "uuid-ossp";

-- ============================================================
-- POSTS (Instagram-style photo posts)
-- ============================================================
drop table if exists public.post_comments cascade;
drop table if exists public.post_likes cascade;
drop table if exists public.posts cascade;

create table public.posts (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null references public.users(id) on delete cascade,
  image_url   text not null,
  caption     text,
  like_count  int  not null default 0,
  comment_count int not null default 0
);

create index posts_user_id_idx on public.posts(user_id);
create index posts_created_at_idx on public.posts(created_at desc);

create table public.post_likes (
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  text        text not null check (char_length(text) <= 500)
);

create index post_comments_post_id_idx on public.post_comments(post_id);

-- Denormalize like/comment counts via triggers
create or replace function public.bump_post_likes()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists post_likes_count on public.post_likes;
create trigger post_likes_count
  after insert or delete on public.post_likes
  for each row execute function public.bump_post_likes();

create or replace function public.bump_post_comments()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists post_comments_count on public.post_comments;
create trigger post_comments_count
  after insert or delete on public.post_comments
  for each row execute function public.bump_post_comments();

-- ============================================================
-- ACTIVITIES (real-world meetups)
-- ============================================================
drop table if exists public.activity_attendees cascade;
drop table if exists public.activities cascade;

create table public.activities (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  host_id        uuid not null references public.users(id) on delete cascade,

  title          text not null,
  description    text,
  category       text not null,          -- coffee, walk, study, sport, art, food, etc.
  cover_image_url text,

  -- Location (lat/lng — no PostGIS needed for MVP)
  latitude       numeric(9,6),
  longitude      numeric(9,6),
  address_label  text,
  city           text,

  starts_at      timestamptz not null,
  duration_mins  int not null default 60,

  max_attendees  int not null default 2,
  current_count  int not null default 1,

  status         text not null default 'open'
                   check (status in ('open','full','cancelled','completed'))
);

create index activities_starts_at_idx on public.activities(starts_at);
create index activities_status_idx on public.activities(status);
create index activities_host_id_idx on public.activities(host_id);

create table public.activity_attendees (
  activity_id  uuid not null references public.activities(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  status       text not null default 'confirmed'
                 check (status in ('pending','confirmed','cancelled','no_show')),
  primary key (activity_id, user_id)
);

-- Keep current_count in sync
create or replace function public.bump_activity_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and new.status = 'confirmed') then
    update public.activities set current_count = current_count + 1 where id = new.activity_id;
  elsif (tg_op = 'DELETE' and old.status = 'confirmed') then
    update public.activities set current_count = greatest(current_count - 1, 1) where id = old.activity_id;
  end if;
  return null;
end; $$;

drop trigger if exists activity_attendees_count on public.activity_attendees;
create trigger activity_attendees_count
  after insert or delete on public.activity_attendees
  for each row execute function public.bump_activity_count();

-- ============================================================
-- VERIFICATION LOGS (QR handshakes)
-- ============================================================
drop table if exists public.verification_logs cascade;

create table public.verification_logs (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  activity_id      uuid references public.activities(id) on delete set null,
  initiator_id     uuid not null references public.users(id) on delete cascade,
  verifier_id      uuid references public.users(id) on delete cascade,
  qr_token         text not null unique,
  token_expires_at timestamptz not null default (now() + interval '30 minutes'),
  verified_at      timestamptz,
  status           text not null default 'pending'
                     check (status in ('pending','verified','expired','rejected'))
);

create index verification_logs_qr_token_idx on public.verification_logs(qr_token);

-- ============================================================
-- REPUTATION REVIEWS
-- ============================================================
drop table if exists public.reputation_reviews cascade;

create table public.reputation_reviews (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz not null default now(),
  activity_id   uuid references public.activities(id) on delete set null,
  reviewer_id   uuid not null references public.users(id) on delete cascade,
  reviewee_id   uuid not null references public.users(id) on delete cascade,
  overall_score int not null check (overall_score between 1 and 5),
  safety_score  int not null check (safety_score between 1 and 5),
  comment       text,
  unique (activity_id, reviewer_id, reviewee_id)
);

-- Auto-recompute reputation on each review
create or replace function public.refresh_user_scores()
returns trigger language plpgsql as $$
begin
  update public.users
  set reputation_score = coalesce((
        select round(avg(overall_score)::numeric * 2, 2)
        from public.reputation_reviews where reviewee_id = new.reviewee_id), 5.00),
      safety_score = coalesce((
        select round(avg(safety_score)::numeric * 2, 2)
        from public.reputation_reviews where reviewee_id = new.reviewee_id), 5.00)
  where id = new.reviewee_id;
  return new;
end; $$;

drop trigger if exists reputation_reviews_refresh on public.reputation_reviews;
create trigger reputation_reviews_refresh
  after insert on public.reputation_reviews
  for each row execute function public.refresh_user_scores();

-- ============================================================
-- CHAT
-- ============================================================
drop table if exists public.messages cascade;
drop table if exists public.conversation_participants cascade;
drop table if exists public.conversations cascade;

create table public.conversations (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  last_message_preview text
);

create table public.conversation_participants (
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  joined_at        timestamptz not null default now(),
  last_read_at     timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_idx on public.conversation_participants(user_id);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  text            text not null check (char_length(text) <= 2000)
);

create index messages_conversation_idx on public.messages(conversation_id, created_at);

-- Bump conversation's last_message on new message
create or replace function public.bump_conversation_last_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = left(new.text, 140)
  where id = new.conversation_id;
  return new;
end; $$;

drop trigger if exists messages_bump_convo on public.messages;
create trigger messages_bump_convo
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- ============================================================
-- STORAGE BUCKET FOR PHOTOS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Let authenticated users upload to their own folder
drop policy if exists "authenticated can upload to photos" on storage.objects;
drop policy if exists "public can read photos" on storage.objects;
drop policy if exists "owners can delete photos" on storage.objects;

create policy "public can read photos" on storage.objects
  for select using (bucket_id = 'photos');

create policy "authenticated can upload to photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos');

create policy "owners can delete photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.activities enable row level security;
alter table public.activity_attendees enable row level security;
alter table public.verification_logs enable row level security;
alter table public.reputation_reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Posts: open reads, own-write
drop policy if exists "posts_read_all" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_read_all"    on public.posts for select using (true);
create policy "posts_insert_own"  on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own"  on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete_own"  on public.posts for delete using (auth.uid() = user_id);

drop policy if exists "likes_read_all" on public.post_likes;
drop policy if exists "likes_write_own" on public.post_likes;
create policy "likes_read_all"   on public.post_likes for select using (true);
create policy "likes_write_own"  on public.post_likes for all using (auth.uid() = user_id);

drop policy if exists "comments_read_all" on public.post_comments;
drop policy if exists "comments_write_own" on public.post_comments;
create policy "comments_read_all"  on public.post_comments for select using (true);
create policy "comments_write_own" on public.post_comments for all using (auth.uid() = user_id);

-- Activities
drop policy if exists "act_read_all" on public.activities;
drop policy if exists "act_insert_host" on public.activities;
drop policy if exists "act_update_host" on public.activities;
create policy "act_read_all"    on public.activities for select using (true);
create policy "act_insert_host" on public.activities for insert with check (auth.uid() = host_id);
create policy "act_update_host" on public.activities for update using (auth.uid() = host_id);

drop policy if exists "att_read_all" on public.activity_attendees;
drop policy if exists "att_write_own" on public.activity_attendees;
create policy "att_read_all"  on public.activity_attendees for select using (true);
create policy "att_write_own" on public.activity_attendees for all using (auth.uid() = user_id);

-- Verification
drop policy if exists "ver_read_parties" on public.verification_logs;
drop policy if exists "ver_insert_init" on public.verification_logs;
drop policy if exists "ver_update_verifier" on public.verification_logs;
create policy "ver_read_parties"    on public.verification_logs for select
  using (auth.uid() = initiator_id or auth.uid() = verifier_id);
create policy "ver_insert_init"     on public.verification_logs for insert
  with check (auth.uid() = initiator_id);
create policy "ver_update_verifier" on public.verification_logs for update
  using (auth.uid() = verifier_id or auth.uid() = initiator_id);

-- Reputation
drop policy if exists "rep_read_all" on public.reputation_reviews;
drop policy if exists "rep_write_author" on public.reputation_reviews;
create policy "rep_read_all"    on public.reputation_reviews for select using (true);
create policy "rep_write_author" on public.reputation_reviews for insert
  with check (auth.uid() = reviewer_id);

-- Conversations: only participants can read or write
drop policy if exists "conv_read_participant" on public.conversations;
drop policy if exists "conv_write_any_auth" on public.conversations;
create policy "conv_read_participant" on public.conversations for select
  using (exists (select 1 from public.conversation_participants
                 where conversation_id = conversations.id and user_id = auth.uid()));
create policy "conv_write_any_auth" on public.conversations for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "cp_read_self" on public.conversation_participants;
drop policy if exists "cp_write_self" on public.conversation_participants;
create policy "cp_read_self"  on public.conversation_participants for select
  using (user_id = auth.uid() or exists (
    select 1 from public.conversation_participants cp2
    where cp2.conversation_id = conversation_participants.conversation_id and cp2.user_id = auth.uid()));
create policy "cp_write_self" on public.conversation_participants for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "msg_read_participant" on public.messages;
drop policy if exists "msg_send_participant" on public.messages;
create policy "msg_read_participant" on public.messages for select
  using (exists (select 1 from public.conversation_participants
                 where conversation_id = messages.conversation_id and user_id = auth.uid()));
create policy "msg_send_participant" on public.messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversation_participants
    where conversation_id = messages.conversation_id and user_id = auth.uid()));

-- Enable realtime on messages & conversations
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
