-- ============================================================
-- UTS demo seed — 3 hyper-local Echoes for the hackathon pitch.
-- Each row sits within walking distance of UTS so the proximity
-- feed lights up the moment you grant geolocation on /home.
--
-- The PostGIS `sync_activity_location` trigger (migration 003)
-- auto-fills the `location` geography column from latitude/longitude,
-- so the RPC `nearby_activities()` will return these instantly.
--
-- Run in Supabase → SQL Editor. Idempotent: deletes prior seed rows
-- by title before re-inserting, so safe to re-run between demos.
--
-- Coordinate map (each within ~600m of UTS Library):
--   UTS Library, Building 2:                   -33.8836, 151.2009
--   Central Station, main concourse:           -33.8830, 151.2068   (~520m east)
--   Cafe ~3 blocks south-east of UTS:          -33.8855, 151.2030   (~280m)
-- ============================================================

do $$
declare
  host uuid;
begin
  -- Pick the first onboarded user as the host
  select id into host
  from public.users
  where onboarding_complete = true
  order by created_at asc
  limit 1;

  if host is null then
    raise exception 'No onboarded user found. Sign up + finish onboarding first.';
  end if;

  -- Re-runnable: wipe any previous seed rows from this host
  delete from public.activities
  where host_id = host
    and title in (
      'Late night study session',
      'Bored, want to go clubbing',
      'Just finished a long shift, looking for someone to grab a quiet tea and vent'
    );

  -- Insert 3 fresh Echoes (current_count starts at 0; the
  -- activity_attendees insert below bumps it to 1)
  with new_rows as (
    insert into public.activities
      (host_id, title, description, category, city, address_label,
       latitude, longitude, starts_at, duration_mins, max_attendees, current_count)
    values
      -- 1. Study session at UTS Library
      (host,
       'Late night study session',
       'Grinding through assignments tonight. Silent focus blocks of 50 min, 10-min breaks. Bring snacks, headphones, and good vibes.',
       'study',
       'Sydney',
       'UTS Library, Building 2 (Quay Street)',
       -33.8836, 151.2009,
       now() + interval '30 minutes', 180, 6, 0),

      -- 2. Clubbing meetup at Central Station
      (host,
       'Bored, want to go clubbing',
       'Need to dance off this week. Meeting under the clock at Central, then heading to a venue together. 18+ photo ID required.',
       'nightlife',
       'Sydney',
       'Sydney Central Station — main concourse, under the clock',
       -33.8830, 151.2068,
       now() + interval '90 minutes', 240, 5, 0),

      -- 3. THE TARGET DEMO RECORD — quiet tea after a long shift
      (host,
       'Just finished a long shift, looking for someone to grab a quiet tea and vent',
       'Long day, low energy. Not looking for anything wild — just a chamomile, a soft chair, and a real conversation. No phones at the table.',
       'chill',
       'Sydney',
       'Mecca Coffee, Goods Line — 3 blocks south-east of UTS',
       -33.8855, 151.2030,
       now() + interval '45 minutes', 90, 2, 0)
    returning id
  )
  -- Add the host as confirmed attendee on each (trigger bumps current_count → 1)
  insert into public.activity_attendees (activity_id, user_id, status)
  select id, host, 'confirmed' from new_rows;

  raise notice 'Seeded 3 UTS-area Echoes for user %', host;
end $$;
