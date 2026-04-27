export function formatExperienceType(code: string): string {
  const map: Record<string, string> = {
    'track-day': 'Track day',
    karting: 'Karting',
    'rocket-rally': 'Rocket Rally',
  };
  return map[code] || code;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
