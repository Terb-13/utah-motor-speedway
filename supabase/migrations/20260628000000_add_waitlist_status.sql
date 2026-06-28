-- Creates garage_waitlist table (if it doesn't exist) + adds status/notes columns.
-- Safe to run even if table was created manually in dashboard.

create table if not exists public.garage_waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  notes text,
  status text not null default 'New',
  created_at timestamptz default now()
);

-- Add columns in case table pre-existed without them
alter table public.garage_waitlist
  add column if not exists status text not null default 'New';

alter table public.garage_waitlist
  add column if not exists notes text;

-- Backfill
update public.garage_waitlist set status = 'New' where status is null;

comment on table public.garage_waitlist is 'Waitlist for private garages';
comment on column public.garage_waitlist.status is 'New | Contacted | Qualified | Booked | Closed';
