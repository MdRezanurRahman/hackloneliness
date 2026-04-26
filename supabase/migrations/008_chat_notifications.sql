-- ============================================================
-- Chat notifications: unread counts (total + per-conversation).
--
-- Runs as SECURITY INVOKER so RLS still applies — these RPCs
-- only return rows the caller can already read.
--
-- Re-runnable.
-- ============================================================

-- ── Total unread for the current user across all conversations ──────
create or replace function public.unread_message_count()
returns int
language sql
stable
security invoker
as $$
  select coalesce(count(*)::int, 0)
  from public.messages m
  join public.conversation_participants cp
    on  cp.conversation_id = m.conversation_id
    and cp.user_id         = auth.uid()
  where m.sender_id   != auth.uid()
    and m.created_at  > cp.last_read_at;
$$;

grant execute on function public.unread_message_count() to authenticated;

-- ── My conversations + per-convo unread + the OTHER participant ─────
-- One round-trip replacement for the 3-query fetch in /messages.
create or replace function public.my_conversations()
returns table (
  conversation_id      uuid,
  last_message_at      timestamptz,
  last_message_preview text,
  unread_count         int,
  other_user_id        uuid,
  other_display_name   text,
  other_avatar_url     text
)
language sql
stable
security invoker
as $$
  select
    c.id                  as conversation_id,
    c.last_message_at,
    c.last_message_preview,
    coalesce((
      select count(*)::int
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id     != auth.uid()
        and m.created_at    > my_p.last_read_at
    ), 0)                 as unread_count,
    other_p.user_id       as other_user_id,
    other_u.display_name  as other_display_name,
    other_u.avatar_url    as other_avatar_url
  from public.conversations c
  join public.conversation_participants my_p
    on  my_p.conversation_id = c.id
    and my_p.user_id         = auth.uid()
  join public.conversation_participants other_p
    on  other_p.conversation_id = c.id
    and other_p.user_id        != auth.uid()
  join public.users other_u
    on other_u.id = other_p.user_id
  order by c.last_message_at desc nulls last;
$$;

grant execute on function public.my_conversations() to authenticated;
