-- ============================================================
-- Fix the "infinite recursion detected in policy for relation
-- conversation_participants" error from migration 002.
--
-- Cause: cp_read_self queried conversation_participants from a
-- policy ON conversation_participants. Postgres aborts.
--
-- Fix: extract the membership check into a SECURITY DEFINER
-- function so it runs without RLS, then reference that function
-- from the policies. While we're here, use the same helper for
-- the conversations/messages policies — same logic, single
-- source of truth.
--
-- Run in Supabase → SQL Editor. Re-runnable.
-- ============================================================

-- ── Helper: is a given user a participant in a given conversation? ──
create or replace function public.is_conversation_participant(
  p_conv uuid,
  p_uid  uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conv
      and user_id = p_uid
  );
$$;

revoke all     on function public.is_conversation_participant(uuid, uuid) from public;
grant  execute on function public.is_conversation_participant(uuid, uuid) to authenticated;

-- ── conversation_participants: replace recursive policy ──
drop policy if exists "cp_read_self" on public.conversation_participants;
create policy "cp_read_self" on public.conversation_participants
  for select
  using (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id, auth.uid())
  );

-- ── conversations: route through the helper too ──
drop policy if exists "conv_read_participant" on public.conversations;
create policy "conv_read_participant" on public.conversations
  for select
  using (public.is_conversation_participant(id, auth.uid()));

-- ── messages: same ──
drop policy if exists "msg_read_participant" on public.messages;
create policy "msg_read_participant" on public.messages
  for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists "msg_send_participant" on public.messages;
create policy "msg_send_participant" on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
  );
