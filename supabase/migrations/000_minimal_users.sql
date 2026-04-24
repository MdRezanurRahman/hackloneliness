-- Minimal schema needed JUST to unblock onboarding.
-- Run this in Supabase → SQL Editor → paste all → "Run".
-- No PostGIS required. The full schema (001_initial_schema.sql) can come later
-- when we build activity matching.

create extension if not exists "uuid-ossp";

-- Drop any partial attempt so this is safely re-runnable
drop table if exists public.users cascade;

create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  display_name    text not null,
  avatar_url      text,
  bio             text,
  age             int check (age is null or (age >= 13 and age <= 120)),
  gender          text,

  city            text,
  country_code    char(2),

  ai_profile      jsonb not null default '{}'::jsonb,

  reputation_score    numeric(4,2) not null default 5.00,
  safety_score        numeric(4,2) not null default 5.00,
  verified_id         boolean not null default false,
  verification_tier   text not null default 'none',
  is_banned           boolean not null default false,

  onboarding_complete boolean not null default false,
  onboarding_step     int not null default 0
);

-- AI sessions (the chat history Lyanna uses)
drop table if exists public.ai_sessions cascade;

create table public.ai_sessions (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  user_id         uuid not null references public.users(id) on delete cascade,
  session_type    text not null default 'onboarding',
  messages        jsonb not null default '[]'::jsonb,
  insights        jsonb not null default '{}'::jsonb,
  completed_at    timestamptz
);

-- RLS
alter table public.users enable row level security;
alter table public.ai_sessions enable row level security;

drop policy if exists "Public profiles are readable" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users can insert their own profile" on public.users;

create policy "Public profiles are readable" on public.users
  for select using (true);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "Users own their AI sessions" on public.ai_sessions;

create policy "Users own their AI sessions" on public.ai_sessions
  for all using (auth.uid() = user_id);
