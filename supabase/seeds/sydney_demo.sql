-- ============================================================
-- Sydney demo seed — 5 hyper-local activities around USYD/UNSW
-- Run in Supabase → SQL Editor. Safe to re-run (idempotent: deletes
-- previous seed rows by title before re-inserting).
--
-- How it works:
--   1. Picks the first onboarded user as the host (that's you for a
--      solo demo; for multi-user testing, change the SELECT to pick
--      a specific user).
--   2. Inserts 5 activities with precise lat/lng. The
--      `sync_activity_location` trigger auto-populates the PostGIS
--      geography column so `/home` proximity search finds them.
--   3. Adds the host as a confirmed attendee (trigger bumps
--      current_count to 1 — correct, matches the attendee row count).
-- ============================================================

do $$
declare
  host uuid;
begin
  -- Pick the first onboarded user. If you want a specific user, replace
  -- with:   select id into host from public.users where display_name = 'YourName';
  select id into host
  from public.users
  where onboarding_complete = true
  order by created_at asc
  limit 1;

  if host is null then
    raise exception 'No onboarded user found. Sign up + finish onboarding first.';
  end if;

  -- Clear any previous seed rows from this host (re-runnable)
  delete from public.activities
  where host_id = host
    and title in (
      'Matcha at Courtyard',
      'Quick study sesh at Fisher',
      'Walk along Victoria Park',
      'Sunset run at Centennial',
      'Dumplings at ABC Eating House'
    );

  -- Activities (current_count starts at 0; trigger bumps to 1 when host attends)
  with new_rows as (
    insert into public.activities
      (host_id, title, description, category, city, address_label,
       latitude, longitude, starts_at, duration_mins, max_attendees, current_count)
    values
      (host, 'Matcha at Courtyard',
       'Quick matcha before class. Come say hi, no agenda.',
       'coffee', 'Sydney', 'USYD Courtyard Café',
       -33.8882, 151.1871, now() + interval '30 minutes', 45, 4, 0),

      (host, 'Quick study sesh at Fisher',
       'Focus session — silent first hour, then coffee break.',
       'study', 'Sydney', 'Fisher Library Level 3',
       -33.8890, 151.1897, now() + interval '1 hour', 120, 6, 0),

      (host, 'Walk along Victoria Park',
       'Fresh air between lectures. Easy pace.',
       'walk', 'Sydney', 'Victoria Park gates',
       -33.8870, 151.1938, now() + interval '2 hours', 60, 3, 0),

      (host, 'Sunset run at Centennial',
       'Easy 4 km loop. All paces welcome.',
       'sport', 'Sydney', 'Centennial Park main gate',
       -33.8967, 151.2322, now() + interval '4 hours', 45, 5, 0),

      (host, 'Dumplings at ABC Eating House',
       'Cheap eats + chat. Split the bill.',
       'food', 'Sydney', 'ABC Eating House, Chippendale',
       -33.8852, 151.1989, now() + interval '6 hours', 75, 6, 0)
    returning id
  )
  -- Host joins each as confirmed attendee (trigger sets current_count = 1)
  insert into public.activity_attendees (activity_id, user_id, status)
  select id, host, 'confirmed' from new_rows;

  raise notice 'Seeded 5 Sydney activities for user %', host;
end $$;
