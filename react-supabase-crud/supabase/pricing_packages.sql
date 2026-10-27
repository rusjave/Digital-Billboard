-- Run this once in the Supabase SQL Editor before using Package Management.
create table if not exists public.pricing_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(12, 2) not null check (price > 0),
  daily_plays integer not null check (daily_plays > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pricing_packages enable row level security;

drop policy if exists "Anyone signed in can view packages" on public.pricing_packages;
create policy "Anyone signed in can view packages"
on public.pricing_packages for select to authenticated using (true);

drop policy if exists "Admins can manage packages" on public.pricing_packages;
create policy "Admins can manage packages"
on public.pricing_packages for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

insert into public.pricing_packages (name, price, daily_plays, sort_order)
values
  ('Basic', 10000, 64, 0),
  ('Package 1', 15000, 128, 1),
  ('Package 2', 20000, 192, 2),
  ('Package 3', 75000, 384, 3),
  ('Package 4', 100000, 960, 4)
on conflict (name) do nothing;

-- One administrator-managed configuration used by every Customize Plan task.
create table if not exists public.custom_plan_settings (
  id boolean primary key default true check (id = true),
  rate numeric(12, 2) not null check (rate > 0),
  rate_unit text not null check (rate_unit in ('second', 'minute')),
  play_length numeric(12, 2) not null check (play_length > 0),
  updated_at timestamptz not null default now()
);

alter table public.custom_plan_settings enable row level security;

drop policy if exists "Anyone signed in can view custom plan settings" on public.custom_plan_settings;
create policy "Anyone signed in can view custom plan settings"
on public.custom_plan_settings for select to authenticated using (true);

drop policy if exists "Admins can manage custom plan settings" on public.custom_plan_settings;
create policy "Admins can manage custom plan settings"
on public.custom_plan_settings for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

insert into public.custom_plan_settings (id, rate, rate_unit, play_length)
values (true, 1, 'second', 40)
on conflict (id) do nothing;
