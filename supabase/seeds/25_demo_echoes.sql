-- ============================================================
-- 25 demo echoes — 5 per account × 5 accounts.
-- Mix per account: 3 photos + 2 words.
--
-- Wipes prior echoes from the five demo accounts before inserting
-- so re-running this file always lands you at the same 25 (no
-- duplicates, no leftovers from older seed runs).
--
-- Photo URLs point to public Unsplash CDN images — no Supabase
-- Storage upload required, keeps the seed self-contained.
--
-- Run AFTER demo_accounts_and_echoes.sql (which creates the 5
-- auth/public users this file references).
-- ============================================================

do $$
declare
  aria_id  uuid;
  jake_id  uuid;
  maya_id  uuid;
  sam_id   uuid;
  priya_id uuid;
begin
  select id into aria_id  from auth.users where email = 'aria@hackloneliness.app'  limit 1;
  select id into jake_id  from auth.users where email = 'jake@hackloneliness.app'  limit 1;
  select id into maya_id  from auth.users where email = 'maya@hackloneliness.app'  limit 1;
  select id into sam_id   from auth.users where email = 'sam@hackloneliness.app'   limit 1;
  select id into priya_id from auth.users where email = 'priya@hackloneliness.app' limit 1;

  if aria_id is null or jake_id is null or maya_id is null or sam_id is null or priya_id is null then
    raise exception 'Demo accounts missing. Run demo_accounts_and_echoes.sql first.';
  end if;

  -- Wipe prior demo posts so the timeline always looks fresh
  delete from public.posts
  where user_id in (aria_id, jake_id, maya_id, sam_id, priya_id);

  insert into public.posts
    (user_id, post_type, image_url, video_url, caption, created_at)
  values
    -- ─── Aria ─── (3 photos, 2 text)
    (aria_id, 'image',
     'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80&auto=format&fit=crop',
     null,
     'Submitted my second paper this month. Brain → soup → recovery → coffee → repeat 🧠',
     now() - interval '2 hours'),

    (aria_id, 'image',
     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
     null,
     'Sunday run cleared my head. Sydney really shows up at 6 am.',
     now() - interval '1 day 6 hours'),

    (aria_id, 'image',
     'https://images.unsplash.com/photo-1536013455201-0afdfc1b2b29?w=800&q=80&auto=format&fit=crop',
     null,
     'Found a new matcha spot in Newtown. Want to test it together?',
     now() - interval '3 days'),

    (aria_id, 'text', null, null,
     'Anyone else feel like Sydney winters were designed for thinking? My best ideas come on these cold morning walks 🌫️',
     now() - interval '4 days 3 hours'),

    (aria_id, 'text', null, null,
     'Hot take: ‘rest’ should be in the syllabus. Also: my Phil & Neuro group is open this Tuesday — DM me.',
     now() - interval '6 days'),

    -- ─── Jake ─── (3 photos, 2 text)
    (jake_id, 'image',
     'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80&auto=format&fit=crop',
     null,
     'Tiny ramen spot near UTS reminded me of home. The owner remembered my order. Small wins.',
     now() - interval '5 hours'),

    (jake_id, 'image',
     'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&auto=format&fit=crop',
     null,
     'Drawing the buildings I walk past every day. Slowly making this city mine.',
     now() - interval '1 day 14 hours'),

    (jake_id, 'image',
     'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&q=80&auto=format&fit=crop',
     null,
     'Found a quiet corner at Single O. New favourite study spot.',
     now() - interval '2 days 8 hours'),

    (jake_id, 'text', null, null,
     'Week 4. Still don’t know anyone outside class. Trying not to spiral about it.',
     now() - interval '4 days 18 hours'),

    (jake_id, 'text', null, null,
     'Reminder to past-Jake: loneliness isn’t a permanent state, just a season. (Telling future-Jake too.)',
     now() - interval '7 days'),

    -- ─── Maya ─── (3 photos, 2 text)
    (maya_id, 'image',
     'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&q=80&auto=format&fit=crop',
     null,
     'Friday night = recovery from the rest of the week 🪩',
     now() - interval '7 hours'),

    (maya_id, 'image',
     'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80&auto=format&fit=crop',
     null,
     'Sunday brunch club, week nine. The bar keeps rising 🍳',
     now() - interval '2 days 4 hours'),

    (maya_id, 'image',
     'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop',
     null,
     'Concert lights in Newtown last night — I have no voice today.',
     now() - interval '4 days'),

    (maya_id, 'text', null, null,
     'Week one at Atlassian: brain full, heart full, calendar fuller. Loving it.',
     now() - interval '5 days 9 hours'),

    (maya_id, 'text', null, null,
     'Hot take: small talk gets a bad rap. It’s just kindness with a low ceiling.',
     now() - interval '8 days'),

    -- ─── Sam ─── (3 photos, 2 text)
    (sam_id, 'image',
     'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80&auto=format&fit=crop',
     null,
     'Day 14 of thesis writing. Fisher Library has become my second home 📚',
     now() - interval '11 hours'),

    (sam_id, 'image',
     'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80&auto=format&fit=crop',
     null,
     'Smash Bros night. Lost. Made two new friends. Worth it.',
     now() - interval '2 days'),

    (sam_id, 'image',
     'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&auto=format&fit=crop',
     null,
     '5am Centennial Park. Three of us showed up. Two finished. Counts as a win.',
     now() - interval '3 days 16 hours'),

    (sam_id, 'text', null, null,
     'Looking for a study buddy who actually studies. Pomodoros, no phones, mutual judgement when we slack 💀',
     now() - interval '5 days 20 hours'),

    (sam_id, 'text', null, null,
     'Hot take: Sydney winter mornings are perfect for jogging if you have the right playlist. The trick is going BEFORE you can talk yourself out of it.',
     now() - interval '9 days'),

    -- ─── Priya ─── (3 photos, 2 text)
    (priya_id, 'image',
     'https://images.unsplash.com/photo-1545987796-200677ee1011?w=800&q=80&auto=format&fit=crop',
     null,
     'An hour at the MCA today. Recharged in a way that screens never can.',
     now() - interval '15 hours'),

    (priya_id, 'image',
     'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80&auto=format&fit=crop',
     null,
     'Started urban sketching again. The Goods Line in twenty minutes.',
     now() - interval '2 days 12 hours'),

    (priya_id, 'image',
     'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&q=80&auto=format&fit=crop',
     null,
     'Frank Gehry’s UTS Business School at golden hour. Architecture is just frozen music.',
     now() - interval '5 days'),

    (priya_id, 'text', null, null,
     'Design observation: a good cafe and a good library follow the same rules. Light, silence, and a soft chair.',
     now() - interval '6 days 6 hours'),

    (priya_id, 'text', null, null,
     'Looking for a sketching partner. I’ll bring snacks if you bring a pencil.',
     now() - interval '10 days');

  raise notice 'Seeded 25 demo echoes (5 per account × 3 photos + 2 text)';
end $$;
