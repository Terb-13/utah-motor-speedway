/**
 * Demo schedule for Wildfire Raceway experiences (Jun–Aug 2026).
 * Used by /api/availability and the booking modal "Check Availability" flow.
 * Dates mirror Utah Motorsports Campus public calendar where applicable.
 */

/** Open dates per experience type (ISO date strings). */
const OPEN_DATES = {
  'track-day': [
    '2026-06-24', '2026-06-27', '2026-06-28',
    '2026-07-08', '2026-07-11', '2026-07-18', '2026-07-19', '2026-07-25',
    '2026-08-01', '2026-08-08', '2026-08-15',
  ],
  karting: [
    '2026-06-14', '2026-06-24', '2026-06-28',
    '2026-07-08', '2026-07-19',
    '2026-08-02', '2026-08-23',
  ],
  'rocket-rally': [
    '2026-06-27', '2026-07-11', '2026-07-25',
    '2026-08-08', '2026-08-15', '2026-08-22',
  ],
};

/** Curated campus events for public display (Jun–Aug 2026). */
const CAMPUS_EVENTS = [
  { date: '2026-06-06', endDate: null, title: 'Whitley Diesel Truck Fest', category: 'Ticketed', location: 'East/West/Kart Paddock' },
  { date: '2026-06-14', endDate: null, title: 'UKC — Round 4', category: 'Karting', location: 'Kart Track' },
  { date: '2026-06-19', endDate: '2026-06-21', title: 'Gold Rush Rally', category: 'Rally', location: 'Campus' },
  { date: '2026-06-20', endDate: '2026-06-21', title: 'USBK Supermoto', category: 'Racing', location: 'Kart Track' },
  { date: '2026-06-24', endDate: null, title: 'Wide Open Wednesday', category: 'Track Day', location: 'Full Circuit' },
  { date: '2026-06-28', endDate: null, title: 'SCCA Utah + UKC Round 5', category: 'Racing', location: 'West Paddock / Kart Track' },
  { date: '2026-07-02', endDate: '2026-07-03', title: 'California Superbikes', category: 'Racing', location: 'Full Circuit' },
  { date: '2026-07-04', endDate: null, title: 'Salt City Drift', category: 'Drift', location: 'West Paddock' },
  { date: '2026-07-11', endDate: '2026-07-12', title: 'USBK Supermoto', category: 'Racing', location: 'Kart Track' },
  { date: '2026-07-18', endDate: '2026-07-19', title: 'SCCA Triple Challenge', category: 'Racing', location: 'East & West Paddock' },
  { date: '2026-07-19', endDate: null, title: 'UKC — Round 6', category: 'Karting', location: 'Kart Track' },
  { date: '2026-08-01', endDate: null, title: 'NASA Utah — Sun Chaser', category: 'Track Day', location: 'Full Circuit' },
  { date: '2026-08-02', endDate: null, title: 'UKC — Round 7', category: 'Karting', location: 'Kart Track' },
  { date: '2026-08-15', endDate: '2026-08-16', title: 'USBK Supermoto + Salt City Drift', category: 'Racing', location: 'Kart Track / West Paddock' },
  { date: '2026-08-23', endDate: null, title: 'UKC — Round 8', category: 'Karting', location: 'Kart Track' },
  { date: '2026-08-25', endDate: '2026-08-31', title: 'Xtreme Xperience', category: 'Drive Experience', location: 'Full Circuit' },
];

const MAX_CAPACITY_PER_DAY = 2; // demo: max concurrent booking requests per experience/date

function getOpenDates(experienceType) {
  return OPEN_DATES[experienceType] || [];
}

/** Check if a date is on the published schedule for an experience. */
function isScheduledOpen(experienceType, dateStr) {
  return getOpenDates(experienceType).includes(dateStr);
}

/**
 * Compare requested date against schedule + existing bookings.
 * @param {string} experienceType
 * @param {string} dateStr ISO date
 * @param {Array<{preferred_date: string, experience_type: string}>} existingBookings
 */
function checkAvailability(experienceType, dateStr, existingBookings) {
  const scheduled = isScheduledOpen(experienceType, dateStr);
  const sameDay = (existingBookings || []).filter(
    (b) => b.experience_type === experienceType && b.preferred_date === dateStr
  );
  const bookedCount = sameDay.length;

  if (!scheduled) {
    const alternatives = getOpenDates(experienceType)
      .filter((d) => d >= (new Date().toISOString().slice(0, 10)))
      .slice(0, 4);
    return {
      available: false,
      reason: 'not_scheduled',
      message: 'This date is not on our published schedule for that experience.',
      alternatives,
      bookedCount,
    };
  }

  if (bookedCount >= MAX_CAPACITY_PER_DAY) {
    const alternatives = getOpenDates(experienceType)
      .filter((d) => d > dateStr && !existingBookings.some(
        (b) => b.experience_type === experienceType && b.preferred_date === d
      ))
      .slice(0, 4);
    return {
      available: false,
      reason: 'fully_booked',
      message: 'This date is at capacity for that experience.',
      alternatives,
      bookedCount,
    };
  }

  if (bookedCount === 1) {
    return {
      available: true,
      reason: 'limited',
      message: 'Limited availability — one slot remaining on this date.',
      alternatives: [],
      bookedCount,
    };
  }

  return {
    available: true,
    reason: 'open',
    message: 'This date is available for your experience.',
    alternatives: [],
    bookedCount,
  };
}

module.exports = {
  OPEN_DATES,
  CAMPUS_EVENTS,
  getOpenDates,
  isScheduledOpen,
  checkAvailability,
};
