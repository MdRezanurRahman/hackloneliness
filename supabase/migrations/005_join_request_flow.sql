-- ============================================================
-- Private check-in flow:
--   Attendees no longer auto-join. They REQUEST → host APPROVES →
--   messaging unlocks → host explicitly REVEALS the meeting point
--   → attendee can scan the QR for check-in.
--
-- Re-runnable. Run in Supabase → SQL Editor.
-- ============================================================

-- ── 1. Status enum gets 'pending' / 'approved' / 'rejected' ──────────
alter table public.activity_attendees
  drop constraint if exists activity_attendees_status_check;

alter table public.activity_attendees
  add constraint activity_attendees_status_check
    check (status in (
      'pending',     -- attendee asked to join, host hasn't decided
      'approved',    -- host said yes, messaging is now unlocked
      'rejected',    -- host declined
      'confirmed',   -- attendee actually showed up (post-QR check-in)
      'cancelled',   -- attendee withdrew
      'no_show'      -- approved but didn't show up
    ));

-- ── 2. Per-attendee location reveal + optional intro message ─────────
alter table public.activity_attendees
  add column if not exists location_revealed_at timestamptz;

alter table public.activity_attendees
  add column if not exists requested_message text
    check (requested_message is null or char_length(requested_message) <= 280);

-- ── 3. Trigger: count only 'approved' or 'confirmed' attendees ───────
-- The old version counted on INSERT(confirmed) only. Now we have to
-- handle status TRANSITIONS (pending → approved bumps; approved →
-- rejected unbumps; etc.).

create or replace function public.bump_activity_count()
returns trigger
language plpgsql
as $$
declare
  was_counted boolean := false;
  is_counted  boolean := false;
begin
  if (tg_op <> 'INSERT') then
    was_counted := old.status in ('approved', 'confirmed');
  end if;
  if (tg_op <> 'DELETE') then
    is_counted  := new.status in ('approved', 'confirmed');
  end if;

  if (is_counted and not was_counted) then
    update public.activities
       set current_count = current_count + 1
     where id = coalesce(new.activity_id, old.activity_id);
  elsif (was_counted and not is_counted) then
    update public.activities
       set current_count = greatest(current_count - 1, 0)
     where id = coalesce(new.activity_id, old.activity_id);
  end if;
  return null;
end;
$$;

drop trigger if exists activity_attendees_count on public.activity_attendees;
create trigger activity_attendees_count
  after insert or update or delete on public.activity_attendees
  for each row execute function public.bump_activity_count();

-- ── 4. RLS: host can manage attendees on THEIR activities ────────────
-- Attendees can already update their own row (att_write_own). Now
-- we also let the host update other people's rows on activities they
-- host (so they can approve/reject and reveal location).

drop policy if exists "att_host_manage" on public.activity_attendees;
create policy "att_host_manage" on public.activity_attendees
  for update
  using (
    exists (
      select 1 from public.activities
      where activities.id = activity_attendees.activity_id
        and activities.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.activities
      where activities.id = activity_attendees.activity_id
        and activities.host_id = auth.uid()
    )
  );

-- ── 5. nearby_activities RPC: mask location for non-approved viewers ─
-- Rules:
--   • Host of the activity → sees address_label/lat/lng
--   • Attendee with status ∈ ('approved','confirmed') AND
--       location_revealed_at IS NOT NULL → sees them
--   • Everyone else → those columns return NULL
--   distance_m and city are always returned (general area is fine).

drop function if exists public.nearby_activities(double precision, double precision, integer, integer);

create or replace function public.nearby_activities(
  lat        double precision,
  lng        double precision,
  radius_m   integer default 5000,
  max_count  integer default 20
)
returns table (
  id                       uuid,
  title                    text,
  description              text,
  category                 text,
  cover_image_url          text,
  address_label            text,
  city                     text,
  starts_at                timestamptz,
  duration_mins            int,
  max_attendees            int,
  current_count            int,
  status                   text,
  latitude                 numeric,
  longitude                numeric,
  host_id                  uuid,
  host_display_name        text,
  host_avatar_url          text,
  host_reputation_score    numeric,
  distance_m               double precision,
  my_attendee_status       text,
  location_revealed        boolean
)
language sql
stable
as $$
  with me as (select auth.uid() as uid)
  select
    a.id,
    a.title,
    a.description,
    a.category,
    a.cover_image_url,
    case
      when a.host_id = (select uid from me)                          then a.address_label
      when att.status in ('approved','confirmed')
           and att.location_revealed_at is not null                  then a.address_label
      else null
    end as address_label,
    a.city,
    a.starts_at,
    a.duration_mins,
    a.max_attendees,
    a.current_count,
    a.status,
    case
      when a.host_id = (select uid from me)                          then a.latitude
      when att.status in ('approved','confirmed')
           and att.location_revealed_at is not null                  then a.latitude
      else null
    end as latitude,
    case
      when a.host_id = (select uid from me)                          then a.longitude
      when att.status in ('approved','confirmed')
           and att.location_revealed_at is not null                  then a.longitude
      else null
    end as longitude,
    a.host_id,
    u.display_name        as host_display_name,
    u.avatar_url          as host_avatar_url,
    u.reputation_score    as host_reputation_score,
    ST_Distance(
      a.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m,
    coalesce(att.status, 'none')                  as my_attendee_status,
    (att.location_revealed_at is not null)        as location_revealed
  from public.activities a
  join public.users u on u.id = a.host_id
  left join public.activity_attendees att
    on att.activity_id = a.id and att.user_id = (select uid from me)
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

grant execute on function public.nearby_activities(double precision, double precision, integer, integer)
  to anon, authenticated;
