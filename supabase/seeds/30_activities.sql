-- ============================================================
-- 30 activities seeded across the 5 demo personas.
--
--   ▸ 20 FUTURE events  (Apr 30 → May 7, 2026)  — 4 per user
--       requested by the user; populates the proximity feed.
--   ▸ 10 PAST events    (Apr 18 → Apr 24, 2026) — 2 per user
--       so the new /profile "Past meetups" section has data to
--       show immediately. A few are pre-set to private to
--       demonstrate the public/private toggle.
--
-- Run AFTER migration 010_activity_privacy.sql. Re-runnable: each
-- activity has a unique title so we delete-by-title before insert.
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
    raise exception 'One of the demo accounts is missing. Run demo_accounts_and_echoes.sql first.';
  end if;

  -- Wipe prior runs of this seed by title (titles are unique to this seed)
  delete from public.activities
  where title in (
    -- Aria future
    'Late night thesis writing','Brain & bagels chat','Cardio loop at Centennial','Phil & neuro discussion',
    -- Jake future
    'Sketching at Goods Line','Mexican comfort food night','Quiet evening reading','Coffee crawl Chippendale',
    -- Maya future
    'Ladies night dance off','Pop-up dance class','Karaoke after work','Friday brunch club',
    -- Sam future
    'Morning jog group','Thesis pomodoro session','Smash Bros at Chippendale','Algorithm prep group',
    -- Priya future
    'MCA Tuesday tour','Architecture walking tour','Urban sketching at Hyde Park','Gallery hopping in Paddington',
    -- Aria past
    'Study sprint at Fisher (past)','Anatomy review with bagels (past)',
    -- Jake past
    'First-week-in-Sydney coffee (past)','Rainy day sketching (past)',
    -- Maya past
    'Friday dance therapy (past)','Sunday brunch crew (past)',
    -- Sam past
    'Saturday morning jog (past)','LeetCode evening (past)',
    -- Priya past
    'MCA opening night (past)','Watercolor in Hyde Park (past)'
  );

  -- ============================================================
  -- FUTURE EVENTS  (Apr 30 → May 7, 2026, all Sydney AEST +10)
  -- ============================================================
  insert into public.activities
    (host_id, title, description, category,
     city, address_label, latitude, longitude,
     starts_at, duration_mins, max_attendees, current_count, is_public)
  values
    -- ─── Aria (host = neuroscience PhD, outgoing) ───
    (aria_id, 'Late night thesis writing',
     'Quiet writing block with snacks. We don''t need to talk much. Just need bodies in the room.',
     'study', 'Sydney', 'UTS Library, Building 2 — Level 5',
     -33.8836, 151.2009, '2026-04-30 21:00+10', 240, 6, 0, true),

    (aria_id, 'Brain & bagels chat',
     'Casual coffee + neuroscience trivia + grad-school venting. Cross-discipline welcome.',
     'coffee', 'Sydney', 'Wedge Espresso, Surry Hills',
     -33.8830, 151.2120, '2026-05-02 10:00+10', 120, 5, 0, true),

    (aria_id, 'Cardio loop at Centennial',
     '5km easy pace, post-run flat white optional. All paces.',
     'sport', 'Sydney', 'Centennial Park main gate',
     -33.8967, 151.2322, '2026-05-04 07:00+10', 60, 8, 0, true),

    (aria_id, 'Phil & neuro discussion',
     'Reading group: free will and the prediction-machine brain. Bring whatever you''re reading.',
     'chill', 'Sydney', 'UTS Building 6 lounge',
     -33.8836, 151.2010, '2026-05-06 18:00+10', 120, 6, 0, true),

    -- ─── Jake (intl student, lonely, designer) ───
    (jake_id, 'Sketching at Goods Line',
     'Bring a sketchbook and a snack. We''ll draw the buildings, ignore the trains, and chat softly.',
     'art', 'Sydney', 'The Goods Line, Ultimo',
     -33.8849, 151.2027, '2026-05-01 16:00+10', 120, 5, 0, true),

    (jake_id, 'Mexican comfort food night',
     'Tacos at El Camino. Looking for someone who''ll order three different fillings and split.',
     'food', 'Sydney', 'El Camino Cantina, Newtown',
     -33.8950, 151.1810, '2026-05-03 19:00+10', 120, 4, 0, true),

    (jake_id, 'Quiet evening reading',
     'No phones. Just books, a candle on the table, and the sound of pages.',
     'chill', 'Sydney', 'Kafe Krua, Glebe',
     -33.8800, 151.1880, '2026-05-05 18:00+10', 90, 3, 0, true),

    (jake_id, 'Coffee crawl Chippendale',
     'Three cafés, one walk, lots of small talk. I''m new to Sydney; show me yours.',
     'coffee', 'Sydney', 'Single O Surry Hills (start)',
     -33.8841, 151.1980, '2026-05-07 11:00+10', 120, 5, 0, true),

    -- ─── Maya (extrovert, marketing intern) ───
    (maya_id, 'Ladies night dance off',
     'Pre-drinks, then we hit the floor at Home. 18+ photo ID required.',
     'nightlife', 'Sydney', 'Home Nightclub, Darling Harbour',
     -33.8723, 151.2010, '2026-04-30 22:00+10', 240, 8, 0, true),

    (maya_id, 'Friday brunch club',
     'Eggs benny, mimosas, big chats. Week 5 of the streak — come ruin your productivity.',
     'food', 'Sydney', 'Reuben Hills, Surry Hills',
     -33.8831, 151.2125, '2026-05-02 11:00+10', 120, 6, 0, true),

    (maya_id, 'Pop-up dance class',
     'Beginner-friendly afro-house workshop. No experience needed, just open shoes and a smile.',
     'music', 'Sydney', 'Newtown Studio, King Street',
     -33.8950, 151.1810, '2026-05-04 14:00+10', 120, 12, 0, true),

    (maya_id, 'Karaoke after work',
     'Belt out something stupid. Drinks two-for-one until 9pm.',
     'music', 'Sydney', 'Sing Sing Karaoke, Sydney CBD',
     -33.8730, 151.2085, '2026-05-06 20:00+10', 120, 8, 0, true),

    -- ─── Sam (data science, balanced, non-binary) ───
    (sam_id, 'Morning jog group',
     'Easy 4km loop, all paces. We end at the cafe so I have a reason to start.',
     'sport', 'Sydney', 'Centennial Park, Paddington Gates',
     -33.8967, 151.2322, '2026-05-01 06:30+10', 60, 6, 0, true),

    (sam_id, 'Thesis pomodoro session',
     'Four pomodoros, two breaks, one mutual judgement when we slack. No phones at the desk.',
     'study', 'Sydney', 'Fisher Library, Level 3',
     -33.8890, 151.1897, '2026-05-03 13:00+10', 240, 6, 0, true),

    (sam_id, 'Smash Bros at Chippendale',
     'Bring a snack, a controller, your worst trash-talk. 4-stock, no items, Final Destination.',
     'gaming', 'Sydney', 'Chippendale shared flat (DM for address)',
     -33.8870, 151.1990, '2026-05-05 19:00+10', 180, 4, 0, true),

    (sam_id, 'Algorithm prep group',
     'Coding interview prep. We''ll do two LeetCode mediums and one hard, then debrief.',
     'study', 'Sydney', 'UTS Building 11 study pods',
     -33.8836, 151.2010, '2026-05-07 17:00+10', 120, 5, 0, true),

    -- ─── Priya (architect, creative) ───
    (priya_id, 'MCA Tuesday tour',
     'I''ll talk about the building, you talk about the art. We''ll both feel smarter.',
     'art', 'Sydney', 'Museum of Contemporary Art, The Rocks',
     -33.8602, 151.2090, '2026-04-30 17:00+10', 90, 6, 0, true),

    (priya_id, 'Architecture walking tour',
     'Barangaroo to Circular Quay. I''ll point at things; you can pretend to be impressed.',
     'walk', 'Sydney', 'Barangaroo Reserve entrance',
     -33.8588, 151.2010, '2026-05-02 16:00+10', 120, 6, 0, true),

    (priya_id, 'Urban sketching at Hyde Park',
     'BYO sketchbook. Pens or pencils. We sketch silently for 30 min, then share.',
     'art', 'Sydney', 'Hyde Park, north end',
     -33.8723, 151.2110, '2026-05-04 11:00+10', 120, 8, 0, true),

    (priya_id, 'Gallery hopping in Paddington',
     'Three small galleries, one wine bar at the end. Looking for slow company.',
     'art', 'Sydney', 'Olsen Gallery, Paddington',
     -33.8852, 151.2255, '2026-05-06 15:00+10', 180, 5, 0, true),

  -- ============================================================
  -- PAST EVENTS  (Apr 18 → 24, 2026)
  -- A couple are pre-set to is_public = false so the privacy
  -- toggle has something to demo right out of the box.
  -- ============================================================

    -- Aria past
    (aria_id, 'Study sprint at Fisher (past)',
     'Three-hour pomodoro block. No phones, no apologies.',
     'study', 'Sydney', 'Fisher Library, Level 3',
     -33.8890, 151.1897, '2026-04-22 14:00+10', 180, 6, 0, true),

    (aria_id, 'Anatomy review with bagels (past)',
     'Casual quiz session before midterms. Aced it, mostly thanks to the bagels.',
     'study', 'Sydney', 'UTS Building 2 lounge',
     -33.8836, 151.2009, '2026-04-19 11:00+10', 120, 5, 0, false),  -- private

    -- Jake past
    (jake_id, 'First-week-in-Sydney coffee (past)',
     'Got nervous, ordered the wrong size, made a friend anyway.',
     'coffee', 'Sydney', 'Single O, Surry Hills',
     -33.8841, 151.1980, '2026-04-21 10:00+10', 60, 3, 0, true),

    (jake_id, 'Rainy day sketching (past)',
     'Stayed inside, drew the cafe instead of the streets.',
     'art', 'Sydney', 'Kafe Krua, Glebe',
     -33.8800, 151.1880, '2026-04-23 15:00+10', 90, 4, 0, true),

    -- Maya past
    (maya_id, 'Friday dance therapy (past)',
     'Bad week, great DJ. Left the venue feeling like myself again.',
     'nightlife', 'Sydney', 'Home Nightclub, Darling Harbour',
     -33.8723, 151.2010, '2026-04-24 22:00+10', 240, 8, 0, false),  -- private

    (maya_id, 'Sunday brunch crew (past)',
     'Eggs, mimosas, three hours of laughing. Highly recommend.',
     'food', 'Sydney', 'Reuben Hills, Surry Hills',
     -33.8831, 151.2125, '2026-04-20 11:00+10', 120, 6, 0, true),

    -- Sam past
    (sam_id, 'Saturday morning jog (past)',
     'Six showed up, three finished. Counts as a win.',
     'sport', 'Sydney', 'Centennial Park',
     -33.8967, 151.2322, '2026-04-19 07:00+10', 60, 6, 0, true),

    (sam_id, 'LeetCode evening (past)',
     'Three mediums, one hard, lots of pizza. Slack is for slackers.',
     'study', 'Sydney', 'UTS Building 11',
     -33.8836, 151.2010, '2026-04-22 18:00+10', 180, 5, 0, true),

    -- Priya past
    (priya_id, 'MCA opening night (past)',
     'New exhibition. Free wine. Met two architects and one chef.',
     'art', 'Sydney', 'MCA, The Rocks',
     -33.8602, 151.2090, '2026-04-18 18:00+10', 180, 6, 0, true),

    (priya_id, 'Watercolor in Hyde Park (past)',
     'Light rain, golden hour, perfect light for the green-grey buildings.',
     'art', 'Sydney', 'Hyde Park, north end',
     -33.8723, 151.2110, '2026-04-23 16:00+10', 120, 4, 0, true);

  -- Add the host as a confirmed attendee on every seeded activity
  -- (the count trigger then bumps current_count to 1).
  insert into public.activity_attendees (activity_id, user_id, status)
  select a.id, a.host_id, 'confirmed'
  from public.activities a
  where a.host_id in (aria_id, jake_id, maya_id, sam_id, priya_id)
    and a.title in (
      'Late night thesis writing','Brain & bagels chat','Cardio loop at Centennial','Phil & neuro discussion',
      'Sketching at Goods Line','Mexican comfort food night','Quiet evening reading','Coffee crawl Chippendale',
      'Ladies night dance off','Pop-up dance class','Karaoke after work','Friday brunch club',
      'Morning jog group','Thesis pomodoro session','Smash Bros at Chippendale','Algorithm prep group',
      'MCA Tuesday tour','Architecture walking tour','Urban sketching at Hyde Park','Gallery hopping in Paddington',
      'Study sprint at Fisher (past)','Anatomy review with bagels (past)',
      'First-week-in-Sydney coffee (past)','Rainy day sketching (past)',
      'Friday dance therapy (past)','Sunday brunch crew (past)',
      'Saturday morning jog (past)','LeetCode evening (past)',
      'MCA opening night (past)','Watercolor in Hyde Park (past)'
    )
  on conflict (activity_id, user_id) do nothing;

  -- Past activities should be marked completed for cleanliness
  update public.activities
  set status = 'completed'
  where starts_at + (duration_mins * interval '1 minute') < now()
    and host_id in (aria_id, jake_id, maya_id, sam_id, priya_id);

  raise notice 'Seeded 20 future + 10 past activities across all 5 demo accounts';
end $$;
