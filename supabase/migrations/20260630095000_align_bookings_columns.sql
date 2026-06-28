-- Align remote bookings table with application API (preferred_date, party_size).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'preferred_date'
  ) then
    alter table public.bookings rename column date to preferred_date;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'num_people'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'party_size'
  ) then
    alter table public.bookings rename column num_people to party_size;
  end if;
end $$;

comment on column public.bookings.preferred_date is 'Requested experience date';
comment on column public.bookings.party_size is 'Number of guests';
