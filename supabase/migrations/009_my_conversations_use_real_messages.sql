-- ============================================================
-- Recompute conversation previews from the messages table directly
-- instead of trusting conversations.last_message_preview (which is
-- a denormalized cache populated by the bump_conversation_last_message
-- trigger, but can be stale or null on rows that existed before the
-- trigger fired).
--
-- Filtering "conversations with at least one message" is now done at
-- the DB layer via an EXISTS clause, so the messages list page sees
-- accurate previews even for conversations the trigger never touched.
--
-- Re-runnable.
-- ============================================================

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
    c.id                                       as conversation_id,
    -- Real last_message_at: use the most recent message row, not the cache
    coalesce(
      (select max(m.created_at) from public.messages m where m.conversation_id = c.id),
      c.last_message_at
    )                                          as last_message_at,
    -- Real preview: last message text, truncated. Computed live, ignores stale cache.
    (
      select left(m.text, 140)
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    )                                          as last_message_preview,
    coalesce((
      select count(*)::int
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id     != auth.uid()
        and m.created_at    > my_p.last_read_at
    ), 0)                                      as unread_count,
    other_p.user_id                            as other_user_id,
    other_u.display_name                       as other_display_name,
    other_u.avatar_url                         as other_avatar_url
  from public.conversations c
  join public.conversation_participants my_p
    on  my_p.conversation_id = c.id
    and my_p.user_id         = auth.uid()
  join public.conversation_participants other_p
    on  other_p.conversation_id = c.id
    and other_p.user_id        != auth.uid()
  join public.users other_u
    on other_u.id = other_p.user_id
  -- Only surface conversations that actually have at least one message,
  -- so empty-but-created conversations stay out of the inbox without
  -- depending on the cached preview field.
  where exists (
    select 1 from public.messages m where m.conversation_id = c.id
  )
  order by
    coalesce(
      (select max(m.created_at) from public.messages m where m.conversation_id = c.id),
      c.last_message_at
    ) desc nulls last;
$$;

grant execute on function public.my_conversations() to authenticated;
