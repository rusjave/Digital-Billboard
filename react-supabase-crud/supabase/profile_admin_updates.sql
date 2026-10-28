-- Run this once in the Supabase SQL Editor.
-- It lets an existing administrator persist role and profile edits for users.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists "Administrators can update profiles" on public.profiles;
create policy "Administrators can update profiles"
on public.profiles
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());
