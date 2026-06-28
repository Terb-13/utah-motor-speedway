-- Garage inventory table for actual rentable units at Wildfire Raceway.
-- Run this in Supabase SQL editor.

create table if not exists public.garages (
  id uuid primary key default gen_random_uuid(),
  unit_number text not null unique,
  size text not null default 'Standard',
  status text not null default 'Available' check (status in ('Available', 'Occupied', 'Reserved', 'Maintenance')),
  tenant_name text,
  notes text,
  created_at timestamptz default now()
);

-- Seed a few demo garages for the demo environment
insert into public.garages (unit_number, size, status, tenant_name, notes) values
  ('A-01', 'Large', 'Available', null, 'Corner unit, direct circuit access'),
  ('A-02', 'Standard', 'Occupied', 'Alex Rivera', 'Long-term founding member'),
  ('B-05', 'Large', 'Available', null, 'Extra height for lifts'),
  ('B-07', 'Standard', 'Reserved', 'Morgan Lee', 'Pending lease signature'),
  ('C-12', 'Standard', 'Available', null, null),
  ('C-14', 'Large', 'Maintenance', null, 'HVAC service scheduled')
on conflict (unit_number) do nothing;

comment on table public.garages is 'Physical garage units available for rent/lease';
comment on column public.garages.status is 'Available | Occupied | Reserved | Maintenance';