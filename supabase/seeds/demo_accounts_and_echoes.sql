-- ============================================================
-- DEMO ACCOUNTS + ECHOES — one-shot seed for 5 testable profiles
-- Run in Supabase → SQL Editor.
--
-- Creates 5 sign-in-able accounts (or re-uses them if already
-- present), fills their public.users row with full onboarding
-- data, and posts 3 Echoes per user (15 total).
--
-- All 5 share the same password: Demo1234!
--
--   aria@hackloneliness.app    Aria   — host / outgoing
--   jake@hackloneliness.app    Jake   — international student / lonely  ⭐ demo target
--   maya@hackloneliness.app    Maya   — extrovert / clubbing energy
--   sam@hackloneliness.app     Sam    — study buddy / non-binary
--   priya@hackloneliness.app   Priya  — architect / creative
--
-- Re-runnable: existing auth users are reused; public.users is
-- upserted; demo posts are wiped + re-inserted each run so the
-- feed timing always looks fresh.
-- ============================================================

create extension if not exists pgcrypto;  -- for crypt() + gen_salt()

do $$
declare
  aria_id  uuid;
  jake_id  uuid;
  maya_id  uuid;
  sam_id   uuid;
  priya_id uuid;
  pw       text := crypt('Demo1234!', gen_salt('bf'));

  -- ── Inline helper: fetch or create the auth user ─────────────
  -- (Inlined 5x below because plpgsql DO blocks can't define
  -- nested functions — keeps the script in one paste-able file.)
begin
  -- ─────────────── Aria ───────────────
  select id into aria_id from auth.users where email = 'aria@hackloneliness.app' limit 1;
  if aria_id is null then
    aria_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      aria_id, 'authenticated', 'authenticated',
      'aria@hackloneliness.app', pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), aria_id,
      jsonb_build_object('sub', aria_id::text, 'email', 'aria@hackloneliness.app'),
      'email', aria_id::text,
      now(), now(), now()
    );
  end if;

  -- ─────────────── Jake ───────────────
  select id into jake_id from auth.users where email = 'jake@hackloneliness.app' limit 1;
  if jake_id is null then
    jake_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      jake_id, 'authenticated', 'authenticated',
      'jake@hackloneliness.app', pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), jake_id,
      jsonb_build_object('sub', jake_id::text, 'email', 'jake@hackloneliness.app'),
      'email', jake_id::text,
      now(), now(), now()
    );
  end if;

  -- ─────────────── Maya ───────────────
  select id into maya_id from auth.users where email = 'maya@hackloneliness.app' limit 1;
  if maya_id is null then
    maya_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      maya_id, 'authenticated', 'authenticated',
      'maya@hackloneliness.app', pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), maya_id,
      jsonb_build_object('sub', maya_id::text, 'email', 'maya@hackloneliness.app'),
      'email', maya_id::text,
      now(), now(), now()
    );
  end if;

  -- ─────────────── Sam ───────────────
  select id into sam_id from auth.users where email = 'sam@hackloneliness.app' limit 1;
  if sam_id is null then
    sam_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      sam_id, 'authenticated', 'authenticated',
      'sam@hackloneliness.app', pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), sam_id,
      jsonb_build_object('sub', sam_id::text, 'email', 'sam@hackloneliness.app'),
      'email', sam_id::text,
      now(), now(), now()
    );
  end if;

  -- ─────────────── Priya ───────────────
  select id into priya_id from auth.users where email = 'priya@hackloneliness.app' limit 1;
  if priya_id is null then
    priya_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      priya_id, 'authenticated', 'authenticated',
      'priya@hackloneliness.app', pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), priya_id,
      jsonb_build_object('sub', priya_id::text, 'email', 'priya@hackloneliness.app'),
      'email', priya_id::text,
      now(), now(), now()
    );
  end if;

  -- ============================================================
  -- public.users — full onboarding profiles (upsert)
  -- ============================================================

  insert into public.users (
    id, display_name, full_name, age, gender, bio,
    onboarding_complete, onboarding_step, ai_profile
  ) values
    (aria_id, 'Aria', 'Aria Patel', 24, 'woman',
     'Neuroscience PhD chasing brain waves and matcha lattes. Let''s do something real this week.',
     true, 12,
     jsonb_build_object(
       'dob', '2000-03-14',
       'education', 'PhD candidate in Neuroscience at UTS',
       'occupation', 'Research assistant at Brain & Mind Centre',
       'religion', 'spiritual',
       'social_battery', 4,
       'drinking', 'sometimes',
       'smoking', 'never',
       'ideal_weekend', jsonb_build_array('cafe_hopping','deep_conversations','outdoor_adventures'),
       'intent', 'gym_buddy',
       'stress_handling', 'exercise',
       'barrier', 'busy'
     )),

    (jake_id, 'Jake', 'Jake Alvarez', 21, 'man',
     'Mexico City → Sydney, week 4. Drawing buildings, drinking flat whites, missing my mom''s cooking. Nice to meet you.',
     true, 12,
     jsonb_build_object(
       'dob', '2003-11-07',
       'education', 'Bachelor of Design (Architecture) at UTS',
       'occupation', 'Barista at Single O',
       'religion', 'agnostic',
       'social_battery', 2,
       'drinking', 'sometimes',
       'smoking', 'never',
       'ideal_weekend', jsonb_build_array('cozy_at_home','deep_conversations','cafe_hopping'),
       'intent', 'new_city',
       'stress_handling', 'isolating',
       'barrier', 'social_anxiety'
     )),

    (maya_id, 'Maya', 'Maya Rashid', 23, 'woman',
     'Marketing intern by day, dance floor enthusiast by night. Friday is non-negotiable 🪩',
     true, 12,
     jsonb_build_object(
       'dob', '2001-06-22',
       'education', 'Master of Marketing at UTS',
       'occupation', 'Brand intern at Atlassian',
       'religion', 'muslim',
       'social_battery', 5,
       'drinking', 'never',
       'smoking', 'never',
       'ideal_weekend', jsonb_build_array('clubbing','cafe_hopping','music'),
       'intent', 'just_chat',
       'stress_handling', 'friends',
       'barrier', 'dont_know_where'
     )),

    (sam_id, 'Sam', 'Sam Park', 22, 'non_binary',
     'Master''s student. 5pm jogger. 11pm thesis writer. Looking for accountability, not friendship per se. Both is great too.',
     true, 12,
     jsonb_build_object(
       'dob', '2002-09-03',
       'education', 'Master of Data Science at UTS',
       'occupation', 'Student',
       'religion', 'buddhist',
       'social_battery', 3,
       'drinking', 'never',
       'smoking', 'never',
       'ideal_weekend', jsonb_build_array('gaming','cozy_at_home','art_museums'),
       'intent', 'gym_buddy',
       'stress_handling', 'creative',
       'barrier', 'language_barrier'
     )),

    (priya_id, 'Priya', 'Priya Sharma', 26, 'woman',
     'Architect at BVN. I draw buildings for a living and people for fun. Always down for a gallery and a long walk.',
     true, 12,
     jsonb_build_object(
       'dob', '1998-12-19',
       'education', 'Bachelor of Architecture (UNSW, 2022)',
       'occupation', 'Architect at BVN Sydney',
       'religion', 'hindu',
       'social_battery', 3,
       'drinking', 'sometimes',
       'smoking', 'never',
       'ideal_weekend', jsonb_build_array('art_museums','outdoor_adventures','cafe_hopping'),
       'intent', 'just_chat',
       'stress_handling', 'creative',
       'barrier', 'busy'
     ))
  on conflict (id) do update set
    display_name        = excluded.display_name,
    full_name           = excluded.full_name,
    age                 = excluded.age,
    gender              = excluded.gender,
    bio                 = excluded.bio,
    onboarding_complete = excluded.onboarding_complete,
    onboarding_step     = excluded.onboarding_step,
    ai_profile          = excluded.ai_profile;

  -- ============================================================
  -- Echoes — wipe + re-insert
  -- ============================================================

  delete from public.posts
  where user_id in (aria_id, jake_id, maya_id, sam_id, priya_id);

  insert into public.posts (user_id, post_type, image_url, video_url, caption, created_at) values
    -- ─── Aria (host, outgoing PhD) ───
    (aria_id, 'image',
     'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80&auto=format&fit=crop',
     null,
     'Submitted my first paper today. To celebrate: I''m hosting matcha at UTS Courtyard tonight 🍵',
     now() - interval '2 hours'),

    (aria_id, 'text', null, null,
     'Anyone else feel like Sydney winters were designed for thinking? My best ideas come on these cold morning walks 🌫️',
     now() - interval '1 day'),

    (aria_id, 'image',
     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
     null,
     'Sunset run cleared my head. Sometimes the body fixes what the mind can''t.',
     now() - interval '3 days'),

    -- ─── Jake (international student, lonely) ───
    (jake_id, 'text', null, null,
     'Week 4 in Sydney. Still don''t know anyone outside class. Putting myself out there feels harder than I thought it would.',
     now() - interval '5 hours'),

    (jake_id, 'image',
     'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80&auto=format&fit=crop',
     null,
     'Found a tiny ramen spot near UTS that reminds me of home. The owner asked my name. Small things matter.',
     now() - interval '2 days'),

    (jake_id, 'text', null, null,
     'Brain dump at 11pm: trying to remind myself that loneliness isn''t a permanent state, just a season. Anyone else feeling this?',
     now() - interval '4 days'),

    -- ─── Maya (clubbing extrovert) ───
    (maya_id, 'image',
     'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&q=80&auto=format&fit=crop',
     null,
     'Friday. Can''t wait. Hit me up if you want to dance off this week 🪩',
     now() - interval '8 hours'),

    (maya_id, 'text', null, null,
     'First week interning at Atlassian. Brain full, heart full, calendar fuller. Loving it.',
     now() - interval '2 days'),

    (maya_id, 'image',
     'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80&auto=format&fit=crop',
     null,
     'Sunday brunch club, week 8. The bar keeps getting higher 🥞',
     now() - interval '5 days'),

    -- ─── Sam (study buddy, non-binary) ───
    (sam_id, 'image',
     'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80&auto=format&fit=crop',
     null,
     'Day 12 of thesis writing. The Fisher Library has become my second home 📚',
     now() - interval '12 hours'),

    (sam_id, 'text', null, null,
     'Hot take: Sydney winter mornings are perfect for jogging if you have the right playlist. The trick is going BEFORE you can talk yourself out of it.',
     now() - interval '1 day'),

    (sam_id, 'text', null, null,
     'Looking for a study buddy who actually studies. Pomodoros, no phones, mutual judgement when we slack. DM me 💀',
     now() - interval '3 days'),

    -- ─── Priya (architect, creative) ───
    (priya_id, 'image',
     'https://images.unsplash.com/photo-1545987796-200677ee1011?w=800&q=80&auto=format&fit=crop',
     null,
     'An hour at the MCA today. Recharged in a way that screens never can.',
     now() - interval '1 day'),

    (priya_id, 'text', null, null,
     'Walking past Frank Gehry''s UTS Business School every day still gets me. Architecture is just frozen music.',
     now() - interval '3 days'),

    (priya_id, 'image',
     'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&auto=format&fit=crop',
     null,
     'Started urban sketching again. Looking for a bench buddy if anyone''s into it 🎨',
     now() - interval '4 days');

  raise notice 'Seeded 5 demo accounts (Aria/Jake/Maya/Sam/Priya) with 15 echoes';
end $$;
