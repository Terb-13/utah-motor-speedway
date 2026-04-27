-- Run in Supabase SQL Editor if the `bookings` table does not yet have these columns.
alter table public.bookings
  add column if not exists status text not null default 'pending';
alter table public.bookings
  add column if not exists notes text;

comment on column public.bookings.status is 'e.g. pending, confirmed, cancelled';
comment on column public.bookings.notes is 'Optional message from the booking form';
