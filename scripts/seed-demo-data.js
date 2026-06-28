#!/usr/bin/env node
/**
 * Re-seed demo data into Supabase (garages, bookings, waitlist).
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment.
 *
 * Usage: node scripts/seed-demo-data.js
 * Or:    npm run seed:demo
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const MIGRATION = path.join(__dirname, '../supabase/migrations/20260630100000_demo_seed_data.sql');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION, 'utf8');
  // Split on statement boundaries (simple: run via rpc if available, else manual inserts)
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Use Supabase Management API isn't available — run inserts via JS for portability
  console.log('Seeding via Supabase client…');

  const garages = [
    ['A-01', 'Large', 'Available', null, 'Corner unit — direct circuit access'],
    ['A-02', 'Standard', 'Occupied', 'Alex Rivera', 'Long-term founding member'],
    ['A-03', 'Standard', 'Reserved', 'Jordan Steele', 'Deposit received — lease pending'],
    ['A-04', 'Large', 'Available', null, 'Extra width for multi-car collections'],
    ['B-05', 'Large', 'Available', null, 'Extra height for lifts'],
    ['B-06', 'Standard', 'Occupied', 'Morgan Lee', 'Porsche GT3 stable'],
    ['B-07', 'Standard', 'Reserved', 'Taylor Chen', 'Pending lease signature'],
    ['B-08', 'Standard', 'Maintenance', null, 'Lighting upgrade in progress'],
    ['C-09', 'Standard', 'Available', null, 'Quiet wing — collector-friendly'],
    ['C-10', 'Large', 'Occupied', 'Chris Nakamura', 'Race team HQ'],
    ['C-11', 'Standard', 'Available', null, null],
    ['C-12', 'Standard', 'Available', null, null],
    ['C-13', 'Large', 'Reserved', 'Dana Wolf', 'Requested C-wing sightlines'],
    ['C-14', 'Large', 'Maintenance', null, 'HVAC service scheduled'],
  ];

  for (const [unit_number, size, status, tenant_name, notes] of garages) {
    const { error } = await supabase.from('garages').upsert(
      { unit_number, size, status, tenant_name, notes },
      { onConflict: 'unit_number' }
    );
    if (error) throw new Error(`garages ${unit_number}: ${error.message}`);
  }
  console.log(`✓ ${garages.length} garage bays`);

  await supabase.from('bookings').delete().like('email', '%@demo.wildfireraceway.com');
  await supabase.from('garage_waitlist').delete().like('email', '%@demo.wildfireraceway.com');

  const bookings = [
    { id: 'a1000001-0001-4000-8000-000000000001', experience_type: 'track-day', preferred_date: '2026-06-28', party_size: 2, full_name: 'Marcus Webb', email: 'marcus.webb@demo.wildfireraceway.com', phone: '(801) 555-0101', notes: 'WOW session — first track day', status: 'Contacted', created_at: '2026-06-26T14:22:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000002', experience_type: 'karting', preferred_date: '2026-06-28', party_size: 6, full_name: 'Elena Vasquez', email: 'elena.vasquez@demo.wildfireraceway.com', phone: '(801) 555-0102', notes: 'Corporate group — UKC weekend', status: 'Qualified', created_at: '2026-06-27T09:15:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000003', experience_type: 'rocket-rally', preferred_date: '2026-07-02', party_size: 12, full_name: 'Tyler & Co Events', email: 'tyler.events@demo.wildfireraceway.com', phone: '(801) 555-0103', notes: 'Bachelor party — 3v3 format', status: 'New', created_at: '2026-06-28T11:00:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000004', experience_type: 'track-day', preferred_date: '2026-07-03', party_size: 1, full_name: 'Priya Sharma', email: 'priya.sharma@demo.wildfireraceway.com', phone: '(801) 555-0104', notes: 'M3 track day', status: 'Booked', created_at: '2026-06-20T16:40:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000005', experience_type: 'karting', preferred_date: '2026-07-04', party_size: 4, full_name: 'The Okamoto Family', email: 'okamoto.family@demo.wildfireraceway.com', phone: '(801) 555-0105', notes: null, status: 'Contacted', created_at: '2026-06-25T18:30:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000006', experience_type: 'track-day', preferred_date: '2026-07-08', party_size: 1, full_name: 'David Chen', email: 'david.chen@demo.wildfireraceway.com', phone: '(801) 555-0106', notes: 'WOW Wednesday', status: 'New', created_at: '2026-07-01T10:00:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000007', experience_type: 'track-day', preferred_date: '2026-07-08', party_size: 2, full_name: 'Sarah Mitchell', email: 'sarah.mitchell@demo.wildfireraceway.com', phone: '(801) 555-0107', notes: 'Second WOW slot', status: 'Qualified', created_at: '2026-07-02T13:45:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000008', experience_type: 'karting', preferred_date: '2026-07-11', party_size: 8, full_name: 'Summit Auto Group', email: 'summit.auto@demo.wildfireraceway.com', phone: '(801) 555-0108', notes: 'Dealer event', status: 'Booked', created_at: '2026-06-15T08:00:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000009', experience_type: 'rocket-rally', preferred_date: '2026-07-11', party_size: 6, full_name: 'Westline Media', email: 'westline@demo.wildfireraceway.com', phone: '(801) 555-0109', notes: 'Team building', status: 'Contacted', created_at: '2026-07-05T15:20:00Z' },
    { id: 'a1000001-0001-4000-8000-00000000000a', experience_type: 'track-day', preferred_date: '2026-07-18', party_size: 3, full_name: 'James Porter', email: 'james.porter@demo.wildfireraceway.com', phone: '(801) 555-0110', notes: 'SCCA weekend', status: 'Booked', created_at: '2026-07-10T12:00:00Z' },
    { id: 'a1000001-0001-4000-8000-00000000000b', experience_type: 'karting', preferred_date: '2026-07-19', party_size: 2, full_name: 'Luna Malyna', email: 'luna.karting@demo.wildfireraceway.com', phone: '(801) 555-0111', notes: 'UKC Round 6', status: 'Booked', created_at: '2026-07-12T09:30:00Z' },
    { id: 'a1000001-0001-4000-8000-00000000000c', experience_type: 'rocket-rally', preferred_date: '2026-07-25', party_size: 9, full_name: 'Forge Capital', email: 'forge.capital@demo.wildfireraceway.com', phone: '(801) 555-0112', notes: 'Client entertainment', status: 'Qualified', created_at: '2026-07-18T17:00:00Z' },
    { id: 'a1000001-0001-4000-8000-00000000000d', experience_type: 'track-day', preferred_date: '2026-08-01', party_size: 2, full_name: 'NASA Member 442', email: 'nasa.442@demo.wildfireraceway.com', phone: '(801) 555-0113', notes: 'Sun Chaser', status: 'Booked', created_at: '2026-07-22T11:15:00Z' },
    { id: 'a1000001-0001-4000-8000-00000000000e', experience_type: 'karting', preferred_date: '2026-08-02', party_size: 3, full_name: 'Rivera Racing', email: 'rivera.racing@demo.wildfireraceway.com', phone: '(801) 555-0114', notes: 'UKC Round 7', status: 'Contacted', created_at: '2026-07-28T14:00:00Z' },
    { id: 'a1000001-0001-4000-8000-00000000000f', experience_type: 'track-day', preferred_date: '2026-08-08', party_size: 1, full_name: 'Keiko Tanaka', email: 'keiko.tanaka@demo.wildfireraceway.com', phone: '(801) 555-0115', notes: null, status: 'New', created_at: '2026-08-01T09:00:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000010', experience_type: 'rocket-rally', preferred_date: '2026-08-15', party_size: 6, full_name: 'Alpine Ventures', email: 'alpine.v@demo.wildfireraceway.com', phone: '(801) 555-0116', notes: 'Annual offsite', status: 'New', created_at: '2026-08-05T10:30:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000011', experience_type: 'karting', preferred_date: '2026-08-23', party_size: 4, full_name: 'SLC Kart Club', email: 'slc.kart@demo.wildfireraceway.com', phone: '(801) 555-0117', notes: 'UKC Round 8', status: 'Qualified', created_at: '2026-08-10T16:45:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000012', experience_type: 'track-day', preferred_date: '2026-08-25', party_size: 2, full_name: 'Xtreme Guest A', email: 'xtreme.a@demo.wildfireraceway.com', phone: '(801) 555-0118', notes: 'Xtreme Xperience week', status: 'Booked', created_at: '2026-08-12T08:20:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000013', experience_type: 'track-day', preferred_date: '2026-06-24', party_size: 1, full_name: 'WOW Regular', email: 'wow.regular@demo.wildfireraceway.com', phone: '(801) 555-0119', notes: 'Completed WOW', status: 'confirmed', created_at: '2026-06-18T12:00:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000014', experience_type: 'karting', preferred_date: '2026-06-14', party_size: 2, full_name: 'Weekend Racer', email: 'weekend.racer@demo.wildfireraceway.com', phone: '(801) 555-0120', notes: null, status: 'confirmed', created_at: '2026-06-10T15:00:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000015', experience_type: 'rocket-rally', preferred_date: '2026-06-27', party_size: 6, full_name: 'Cancelled Group', email: 'cancelled.grp@demo.wildfireraceway.com', phone: '(801) 555-0121', notes: 'Rescheduled', status: 'cancelled', created_at: '2026-06-22T09:00:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000016', experience_type: 'track-day', preferred_date: '2026-07-04', party_size: 1, full_name: 'Pending Inquiry', email: 'pending.inq@demo.wildfireraceway.com', phone: '(801) 555-0122', notes: 'Awaiting callback', status: 'pending', created_at: '2026-06-29T08:00:00Z' },
    { id: 'a1000001-0001-4000-8000-000000000017', experience_type: 'karting', preferred_date: '2026-07-19', party_size: 2, full_name: 'Closed Lead', email: 'closed.lead@demo.wildfireraceway.com', phone: '(801) 555-0123', notes: 'Went elsewhere', status: 'Closed', created_at: '2026-07-01T11:00:00Z' },
  ];

  const { error: bErr } = await supabase.from('bookings').insert(bookings);
  if (bErr) throw new Error(`bookings: ${bErr.message}`);
  console.log(`✓ ${bookings.length} bookings`);

  const waitlist = [
    { id: 'b2000002-0002-4000-8000-000000000001', full_name: 'Victoria Hayes', email: 'victoria.hayes@demo.wildfireraceway.com', phone: '(801) 555-0201', notes: 'Interested in unit A-01 (Large). Ferrari 488 + daily.', status: 'New', created_at: '2026-06-28T08:30:00Z' },
    { id: 'b2000002-0002-4000-8000-000000000002', full_name: 'Robert Kim', email: 'robert.kim@demo.wildfireraceway.com', phone: '(801) 555-0202', notes: 'Prefers B-05 — needs lift clearance for GT4.', status: 'Contacted', created_at: '2026-06-25T14:00:00Z' },
    { id: 'b2000002-0002-4000-8000-000000000003', full_name: 'Amanda Foster', email: 'amanda.foster@demo.wildfireraceway.com', phone: '(801) 555-0203', notes: 'Interested in unit C-12 (Standard).', status: 'Qualified', created_at: '2026-06-20T10:15:00Z' },
    { id: 'b2000002-0002-4000-8000-000000000004', full_name: 'Michael Torres', email: 'michael.torres@demo.wildfireraceway.com', phone: '(801) 555-0204', notes: 'Wants A-wing corner — willing to wait for A-04.', status: 'Contacted', created_at: '2026-06-18T16:45:00Z' },
    { id: 'b2000002-0002-4000-8000-000000000005', full_name: 'Jennifer Walsh', email: 'jennifer.walsh@demo.wildfireraceway.com', phone: '(801) 555-0205', notes: 'Two-car collection + office space above.', status: 'Booked', created_at: '2026-06-05T09:00:00Z' },
    { id: 'b2000002-0002-4000-8000-000000000006', full_name: 'Daniel Okonkwo', email: 'daniel.okonkwo@demo.wildfireraceway.com', phone: '(801) 555-0206', notes: 'Interested in any available Large bay.', status: 'New', created_at: '2026-06-27T19:20:00Z' },
    { id: 'b2000002-0002-4000-8000-000000000007', full_name: 'Sofia Mendez', email: 'sofia.mendez@demo.wildfireraceway.com', phone: '(801) 555-0207', notes: 'Reserved B-07 follow-up.', status: 'Qualified', created_at: '2026-06-15T11:30:00Z' },
    { id: 'b2000002-0002-4000-8000-000000000008', full_name: 'Grant Patterson', email: 'grant.patterson@demo.wildfireraceway.com', phone: '(801) 555-0208', notes: 'C-11 preferred. McLaren + vintage Porsche.', status: 'Contacted', created_at: '2026-06-22T13:00:00Z' },
    { id: 'b2000002-0002-4000-8000-000000000009', full_name: 'Lisa Hammond', email: 'lisa.hammond@demo.wildfireraceway.com', phone: '(801) 555-0209', notes: 'Wait until Phase 2.', status: 'Closed', created_at: '2026-05-30T08:00:00Z' },
    { id: 'b2000002-0002-4000-8000-00000000000a', full_name: 'Ethan Brooks', email: 'ethan.brooks@demo.wildfireraceway.com', phone: '(801) 555-0210', notes: 'Interested in unit A-03 when reserved clears.', status: 'New', created_at: '2026-06-28T07:45:00Z' },
  ];

  const { error: wErr } = await supabase.from('garage_waitlist').insert(waitlist);
  if (wErr) throw new Error(`waitlist: ${wErr.message}`);
  console.log(`✓ ${waitlist.length} waitlist entries`);
  console.log('Demo seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
