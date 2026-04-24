-- PostGIS + proximity search for hyper-local activity matching.
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- What this does:
--   1. Enables the PostGIS extension
--   2. Adds a `location geography(Point, 4326)` column to activities
--   3. Creates a BEFORE trigger that auto-syncs location from lat/lng,
--      so existing app code (which only writes latitude/longitude) keeps working
--   4. Backfills location for any rows that already have lat/lng
--   5. Adds a GiST spatial index for sub-ms distance queries
--   6. Exposes a public RPC `nearby_activities(lat, lng, radius_m, max_count)`
--      returning activities + host + distance, ordered by starts_at
--
-- Sydney demo coordinates (drop into the RPC while testing):
--   USYD (F23 Admin Building):  -33.8882, 151.1871
--   UNSW (Main Walkway):        -33.9173, 151.2313
--   Sydney CBD (Town Hall):     -33.8734, 151.2061

create extension if not exists postgis;

-- ── Column ────────────────────────────────────────────────────────────
alter table public.activities
  add column if not exists location geography(Point, 4326);

-- ── Auto-sync trigger (geography column mirrors lat/lng) ──────────────
create or replace function public.sync_activity_location()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    -- PostGIS expects (longitude, latitude) order when constructing points
    new.location := ST_SetSRID(
                      ST_MakePoint(new.longitude::float8, new.latitude::float8),
                      4326
                    )::geography;
  else
    new.location := null;
  end if;
  return new;
end;
$$;

drop trigger if exists activities_sync_location on public.activities;
create trigger activities_sync_location
  before insert or update of latitude, longitude
  on public.activities
  for each row
  execute function public.sync_activity_location();

-- ── Backfill existing rows ────────────────────────────────────────────
update public.activities
set location = ST_SetSRID(
                 ST_MakePoint(longitude::float8, latitude::float8),
                 4326
               )::geography
where location is null
  and latitude is not null
  and longitude is not null;

-- ── GiST index for fast ST_DWithin / ST_Distance queries ─────────────
create index if not exists activities_location_gist
  on public.activities
  using gist (location);

-- ── Proximity RPC ─────────────────────────────────────────────────────
-- Returns open, future activities within `radius_m` meters of (lat, lng),
-- ordered by starts_at ascending. Flat columns (including host fields)
-- so the client can consume it in one round-trip without extra joins.
--
-- The function is `security invoker` (default): RLS on `activities` and
-- `users` still applies. Since both have public read policies, this is fine.
drop function if exists public.nearby_activities(double precision, double precision, integer, integer);

create or replace function public.nearby_activities(
  lat           double precision,
  lng           double precision,
  radius_m      integer default 5000,
  max_count     integer default 20
)
returns table (
  id                     uuid,
  title                  text,
  description            text,
  category               text,
  cover_image_url        text,
  address_label          text,
  city                   text,
  starts_at              timestamptz,
  duration_mins          int,
  max_attendees          int,
  current_count          int,
  status                 text,
  latitude               numeric,
  longitude              numeric,
  host_id                uuid,
  host_display_name      text,
  host_avatar_url        text,
  host_reputation_score  numeric,
  distance_m             double precision
)
language sql
stable
as $$
  select
    a.id,
    a.title,
    a.description,
    a.category,
    a.cover_image_url,
    a.address_label,
    a.city,
    a.starts_at,
    a.duration_mins,
    a.max_attendees,
    a.current_count,
    a.status,
    a.latitude,
    a.longitude,
    a.host_id,
    u.display_name    as host_display_name,
    u.avatar_url      as host_avatar_url,
    u.reputation_score as host_reputation_score,
    ST_Distance(
      a.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    )                 as distance_m
  from public.activities a
  join public.users     u on u.id = a.host_id
  where a.status = 'open'
    and a.starts_at >= now()
    and a.location is not null
    and ST_DWithin(
          a.location,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_m
        )
  order by a.starts_at asc
  limit max_count;
$$;

-- Allow PostgREST to expose this to both authenticated and anon clients
grant execute on function public.nearby_activities(double precision, double precision, integer, integer)
  to anon, authenticated;
