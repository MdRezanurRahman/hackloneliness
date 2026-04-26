-- ============================================================
-- Per-activity privacy flag.
--
-- Hosts can choose whether each activity stays visible on their
-- public profile after it ends. Future events are still always
-- discoverable in the feed (otherwise "Who can see my meetup"
-- becomes a discoverability paradox); this column only gates the
-- "Past meetups" section on /profile/[id] for non-host viewers.
--
-- Re-runnable.
-- ============================================================

alter table public.activities
  add column if not exists is_public boolean not null default true;

create index if not exists activities_host_past_idx
  on public.activities (host_id, starts_at desc)
  where starts_at < now();
