-- Run this once in the Supabase SQL Editor before deploying the booking-schedule UI.
-- Existing scheduled_at bookings remain readable as a backwards-compatible fallback.
alter table public.todos
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists daily_run_times jsonb not null default '[]'::jsonb;

alter table public.todos
  drop constraint if exists todos_booking_date_range_check;

alter table public.todos
  add constraint todos_booking_date_range_check
  check (start_date is null or end_date is null or end_date >= start_date);

comment on column public.todos.start_date is 'First date on which this booking runs.';
comment on column public.todos.end_date is 'Last date on which this booking runs.';
comment on column public.todos.daily_run_times is 'JSON array of local daily run times in HH:MM format.';

-- A billboard can have only one booking on any given date. The trigger is the
-- source of truth; it also protects against two users submitting at once.
create or replace function public.is_booking_range_available(p_start_date date, p_end_date date)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.todos
    where coalesce(start_date, scheduled_at::date) <= p_end_date
      and coalesce(end_date, start_date, scheduled_at::date) >= p_start_date
  );
$$;

grant execute on function public.is_booking_range_available(date, date) to authenticated;

create or replace function public.prevent_overlapping_todo_bookings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.start_date is null or new.end_date is null then
    return new;
  end if;

  -- Serialise date-range checks so two simultaneous submissions cannot overlap.
  lock table public.todos in share row exclusive mode;

  if exists (
    select 1
    from public.todos as existing_booking
    where existing_booking.id is distinct from new.id
      and coalesce(existing_booking.start_date, existing_booking.scheduled_at::date) <= new.end_date
      and coalesce(existing_booking.end_date, existing_booking.start_date, existing_booking.scheduled_at::date) >= new.start_date
  ) then
    raise exception 'The selected booking dates are already reserved.' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_overlapping_todo_bookings on public.todos;
create trigger prevent_overlapping_todo_bookings
before insert or update of start_date, end_date on public.todos
for each row execute function public.prevent_overlapping_todo_bookings();
