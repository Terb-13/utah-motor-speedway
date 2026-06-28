-- Demo seed data for Wildfire Raceway CEO presentation.
-- Idempotent: demo rows use @demo.wildfireraceway.com emails; garages upsert on unit_number.

-- ── Garage inventory (all 14 floorplan bays) ──
insert into public.garages (unit_number, size, status, tenant_name, notes) values
  ('A-01', 'Large',    'Available',   null,            'Corner unit — direct circuit access'),
  ('A-02', 'Standard', 'Occupied',    'Alex Rivera',   'Long-term founding member'),
  ('A-03', 'Standard', 'Reserved',    'Jordan Steele', 'Deposit received — lease pending'),
  ('A-04', 'Large',    'Available',   null,            'Extra width for multi-car collections'),
  ('B-05', 'Large',    'Available',   null,            'Extra height for lifts'),
  ('B-06', 'Standard', 'Occupied',    'Morgan Lee',    'Porsche GT3 stable'),
  ('B-07', 'Standard', 'Reserved',    'Taylor Chen',   'Pending lease signature'),
  ('B-08', 'Standard', 'Maintenance', null,            'Lighting upgrade in progress'),
  ('C-09', 'Standard', 'Available',   null,            'Quiet wing — collector-friendly'),
  ('C-10', 'Large',    'Occupied',    'Chris Nakamura','Race team HQ'),
  ('C-11', 'Standard', 'Available',   null,            null),
  ('C-12', 'Standard', 'Available',   null,            null),
  ('C-13', 'Large',    'Reserved',    'Dana Wolf',     'Requested C-wing sightlines'),
  ('C-14', 'Large',    'Maintenance', null,            'HVAC service scheduled')
on conflict (unit_number) do update set
  size = excluded.size,
  status = excluded.status,
  tenant_name = excluded.tenant_name,
  notes = excluded.notes;

-- ── Clear prior demo bookings & waitlist (safe to re-run) ──
delete from public.bookings where email like '%@demo.wildfireraceway.com';
delete from public.garage_waitlist where email like '%@demo.wildfireraceway.com';

-- ── Experience bookings (Jun–Aug 2026 + pipeline statuses) ──
insert into public.bookings (
  id, experience_type, preferred_date, party_size, full_name, email, phone, notes, status, created_at
) values
  -- This week (shows on Command Center schedule)
  ('a1000001-0001-4000-8000-000000000001', 'track-day',    '2026-06-28', 2,  'Marcus Webb',       'marcus.webb@demo.wildfireraceway.com',       '(801) 555-0101', 'WOW session — first track day',                    'Contacted',  '2026-06-26 14:22:00+00'),
  ('a1000001-0001-4000-8000-000000000002', 'karting',      '2026-06-28', 6,  'Elena Vasquez',     'elena.vasquez@demo.wildfireraceway.com',     '(801) 555-0102', 'Corporate group — UKC weekend',                    'Qualified',  '2026-06-27 09:15:00+00'),
  ('a1000001-0001-4000-8000-000000000003', 'rocket-rally', '2026-07-02', 12, 'Tyler & Co Events', 'tyler.events@demo.wildfireraceway.com',      '(801) 555-0103', 'Bachelor party — 3v3 format',                      'New',        '2026-06-28 11:00:00+00'),
  ('a1000001-0001-4000-8000-000000000004', 'track-day',    '2026-07-03', 1,  'Priya Sharma',      'priya.sharma@demo.wildfireraceway.com',      '(801) 555-0104', 'M3 track day — intermediate',                      'Booked',     '2026-06-20 16:40:00+00'),
  ('a1000001-0001-4000-8000-000000000005', 'karting',      '2026-07-04', 4,  'The Okamoto Family','okamoto.family@demo.wildfireraceway.com',   '(801) 555-0105', null,                                               'Contacted',  '2026-06-25 18:30:00+00'),
  -- July — fills calendar + availability checks
  ('a1000001-0001-4000-8000-000000000006', 'track-day',    '2026-07-08', 1,  'David Chen',        'david.chen@demo.wildfireraceway.com',        '(801) 555-0106', 'WOW Wednesday inquiry',                            'New',        '2026-07-01 10:00:00+00'),
  ('a1000001-0001-4000-8000-000000000007', 'track-day',    '2026-07-08', 2,  'Sarah Mitchell',    'sarah.mitchell@demo.wildfireraceway.com',    '(801) 555-0107', 'Second WOW slot — creates limited availability',   'Qualified',  '2026-07-02 13:45:00+00'),
  ('a1000001-0001-4000-8000-000000000008', 'karting',      '2026-07-11', 8,  'Summit Auto Group', 'summit.auto@demo.wildfireraceway.com',       '(801) 555-0108', 'Dealer event — need 8 karts',                        'Booked',     '2026-06-15 08:00:00+00'),
  ('a1000001-0001-4000-8000-000000000009', 'rocket-rally', '2026-07-11', 6,  'Westline Media',    'westline@demo.wildfireraceway.com',          '(801) 555-0109', 'Team building — film crew on site',                'Contacted',  '2026-07-05 15:20:00+00'),
  ('a1000001-0001-4000-8000-00000000000a', 'track-day',    '2026-07-18', 3,  'James Porter',      'james.porter@demo.wildfireraceway.com',      '(801) 555-0110', 'SCCA weekend — shared paddock',                    'Booked',     '2026-07-10 12:00:00+00'),
  ('a1000001-0001-4000-8000-00000000000b', 'karting',      '2026-07-19', 2,  'Luna Malyna',       'luna.karting@demo.wildfireraceway.com',      '(801) 555-0111', 'UKC Round 6 — practice session',                   'Booked',     '2026-07-12 09:30:00+00'),
  ('a1000001-0001-4000-8000-00000000000c', 'rocket-rally', '2026-07-25', 9,  'Forge Capital',     'forge.capital@demo.wildfireraceway.com',     '(801) 555-0112', 'Client entertainment — 3 teams',                   'Qualified',  '2026-07-18 17:00:00+00'),
  -- August
  ('a1000001-0001-4000-8000-00000000000d', 'track-day',    '2026-08-01', 2,  'NASA Member 442',   'nasa.442@demo.wildfireraceway.com',          '(801) 555-0113', 'Sun Chaser — NASA Utah',                           'Booked',     '2026-07-22 11:15:00+00'),
  ('a1000001-0001-4000-8000-00000000000e', 'karting',      '2026-08-02', 3,  'Rivera Racing',     'rivera.racing@demo.wildfireraceway.com',     '(801) 555-0114', 'UKC Round 7',                                      'Contacted',  '2026-07-28 14:00:00+00'),
  ('a1000001-0001-4000-8000-00000000000f', 'track-day',    '2026-08-08', 1,  'Keiko Tanaka',      'keiko.tanaka@demo.wildfireraceway.com',      '(801) 555-0115', null,                                               'New',        '2026-08-01 09:00:00+00'),
  ('a1000001-0001-4000-8000-000000000010', 'rocket-rally', '2026-08-15', 6,  'Alpine Ventures',   'alpine.v@demo.wildfireraceway.com',         '(801) 555-0116', 'Annual offsite — Rocket Rally preferred',          'New',        '2026-08-05 10:30:00+00'),
  ('a1000001-0001-4000-8000-000000000011', 'karting',      '2026-08-23', 4,  'SLC Kart Club',     'slc.kart@demo.wildfireraceway.com',          '(801) 555-0117', 'UKC Round 8 — club block',                         'Qualified',  '2026-08-10 16:45:00+00'),
  ('a1000001-0001-4000-8000-000000000012', 'track-day',    '2026-08-25', 2,  'Xtreme Guest A',    'xtreme.a@demo.wildfireraceway.com',          '(801) 555-0118', 'Xtreme Xperience week — referral',                 'Booked',     '2026-08-12 08:20:00+00'),
  -- Legacy statuses (Bookings calendar view)
  ('a1000001-0001-4000-8000-000000000013', 'track-day',    '2026-06-24', 1,  'WOW Regular',       'wow.regular@demo.wildfireraceway.com',       '(801) 555-0119', 'Completed WOW session',                            'confirmed',  '2026-06-18 12:00:00+00'),
  ('a1000001-0001-4000-8000-000000000014', 'karting',      '2026-06-14', 2,  'Weekend Racer',     'weekend.racer@demo.wildfireraceway.com',     '(801) 555-0120', null,                                               'confirmed',  '2026-06-10 15:00:00+00'),
  ('a1000001-0001-4000-8000-000000000015', 'rocket-rally', '2026-06-27', 6,  'Cancelled Group',   'cancelled.grp@demo.wildfireraceway.com',     '(801) 555-0121', 'Rescheduled — weather',                            'cancelled',  '2026-06-22 09:00:00+00'),
  ('a1000001-0001-4000-8000-000000000016', 'track-day',    '2026-07-04', 1,  'Pending Inquiry',   'pending.inq@demo.wildfireraceway.com',       '(801) 555-0122', 'Awaiting callback',                                'pending',    '2026-06-29 08:00:00+00'),
  ('a1000001-0001-4000-8000-000000000017', 'karting',      '2026-07-19', 2,  'Closed Lead',       'closed.lead@demo.wildfireraceway.com',       '(801) 555-0123', 'Went with competitor venue',                       'Closed',     '2026-07-01 11:00:00+00');

-- ── Garage waitlist (pipeline demo) ──
insert into public.garage_waitlist (id, full_name, email, phone, notes, status, created_at) values
  ('b2000002-0002-4000-8000-000000000001', 'Victoria Hayes',    'victoria.hayes@demo.wildfireraceway.com',    '(801) 555-0201', 'Interested in unit A-01 (Large). Ferrari 488 + daily.',     'New',        '2026-06-28 08:30:00+00'),
  ('b2000002-0002-4000-8000-000000000002', 'Robert Kim',        'robert.kim@demo.wildfireraceway.com',        '(801) 555-0202', 'Prefers B-05 — needs lift clearance for GT4.',              'Contacted',  '2026-06-25 14:00:00+00'),
  ('b2000002-0002-4000-8000-000000000003', 'Amanda Foster',     'amanda.foster@demo.wildfireraceway.com',     '(801) 555-0203', 'Interested in unit C-12 (Standard).',                       'Qualified',  '2026-06-20 10:15:00+00'),
  ('b2000002-0002-4000-8000-000000000004', 'Michael Torres',    'michael.torres@demo.wildfireraceway.com',    '(801) 555-0204', 'Wants A-wing corner — willing to wait for A-04.',           'Contacted',  '2026-06-18 16:45:00+00'),
  ('b2000002-0002-4000-8000-000000000005', 'Jennifer Walsh',    'jennifer.walsh@demo.wildfireraceway.com',    '(801) 555-0205', 'Two-car collection + office space above. Budget approved.', 'Booked',     '2026-06-05 09:00:00+00'),
  ('b2000002-0002-4000-8000-000000000006', 'Daniel Okonkwo',    'daniel.okonkwo@demo.wildfireraceway.com',    '(801) 555-0206', 'Track-day regular — interested in any available Large bay.', 'New',       '2026-06-27 19:20:00+00'),
  ('b2000002-0002-4000-8000-000000000007', 'Sofia Mendez',      'sofia.mendez@demo.wildfireraceway.com',      '(801) 555-0207', 'Reserved B-07 follow-up — backup if deal falls through.',    'Qualified',  '2026-06-15 11:30:00+00'),
  ('b2000002-0002-4000-8000-000000000008', 'Grant Patterson',   'grant.patterson@demo.wildfireraceway.com',   '(801) 555-0208', 'C-11 preferred. McLaren + vintage Porsche.',                'Contacted',  '2026-06-22 13:00:00+00'),
  ('b2000002-0002-4000-8000-000000000009', 'Lisa Hammond',      'lisa.hammond@demo.wildfireraceway.com',      '(801) 555-0209', 'Decided to wait until Phase 2 expansion.',                  'Closed',     '2026-05-30 08:00:00+00'),
  ('b2000002-0002-4000-8000-00000000000a', 'Ethan Brooks',      'ethan.brooks@demo.wildfireraceway.com',      '(801) 555-0210', 'Interested in unit A-03 when reserved status clears.',      'New',        '2026-06-28 07:45:00+00');

comment on table public.garages is 'Physical garage units — demo seed includes all 14 floorplan bays';
