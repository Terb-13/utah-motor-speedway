-- Adds status + ensures notes for garage_waitlist to support unified inquiries pipeline.
-- Run this (or equivalent) in Supabase SQL editor if columns are missing.

alter table public.garage_waitlist
  add column if not exists status text not null default 'New';

alter table public.garage_waitlist
  add column if not exists notes text;

-- Optional: backfill existing rows
update public.garage_waitlist set status = 'New' where status is null;

comment on column public.garage_waitlist.status is 'New | Contacted | Qualified | Booked | Closed';
comment on column public.garage_waitlist.notes is 'Internal notes for follow-up';
