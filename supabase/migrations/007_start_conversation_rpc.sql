-- ============================================================
-- Fix: "new row violates RLS policy for table conversations"
--
-- Starting a 1:1 chat requires THREE writes:
--   1. INSERT into public.conversations
--   2. INSERT into public.conversation_participants (me)
--   3. INSERT into public.conversation_participants (other user)
--
-- Step 1 was gated by auth.role() = 'authenticated' which has
-- been flaky across Supabase versions. Step 3 is impossible
-- under the cp_write_self policy because that policy says you
-- can only insert your OWN participant row.
--
-- Solution: a SECURITY DEFINER RPC that performs all three
-- writes inside a single transaction with RLS bypassed, while
-- still gating on auth.uid() being non-null.
--
-- The RPC is also idempotent — if a 1:1 conversation between
-- the two users already exists, it returns that id instead of
-- creating a duplicate.
-- ============================================================

create or replace function public.start_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me   uuid;
  conv uuid;
begin
  me := auth.uid();
  if me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if me = other_user_id then
    raise exception 'Cannot start a conversation with yourself'
      using errcode = '22023';
  end if;

  -- Reuse any existing 1:1 conversation between these two users
  select cp1.conversation_id
    into conv
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id
  where cp1.user_id = me
    and cp2.user_id = other_user_id
  limit 1;

  if conv is not null then
    return conv;
  end if;

  -- Otherwise create a fresh one with both participants
  insert into public.conversations default values returning id into conv;
  insert into public.conversation_participants (conversation_id, user_id) values
    (conv, me),
    (conv, other_user_id);

  return conv;
end;
$$;

revoke all     on function public.start_conversation(uuid) from public;
grant  execute on function public.start_conversation(uuid) to authenticated;
