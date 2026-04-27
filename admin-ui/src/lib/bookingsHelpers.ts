import type { BookingRow } from './api';
import { formatDate, formatExperienceType } from './format';

export function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeConflictDates(rows: { preferred_date: string }[]): Set<string> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.preferred_date, (m.get(r.preferred_date) || 0) + 1);
  }
  const s = new Set<string>();
  m.forEach((c, d) => {
    if (c > 1) s.add(d);
  });
  return s;
}

export function buildBookingTooltip(b: BookingRow): string {
  const lines = [
    `${formatExperienceType(b.experience_type)} — ${b.full_name}`,
    `Date: ${formatDate(b.preferred_date)} (all day)`,
    `Party: ${b.party_size} · Status: ${(b.status || 'pending').toString()}`,
    b.email ? `Email: ${b.email}` : '',
    b.phone ? `Phone: ${b.phone}` : '',
    b.notes ? `Notes: ${b.notes}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadBookingsCsv(rows: BookingRow[], filename: string) {
  const header = [
    'Date',
    'Experience',
    'Name',
    'Email',
    'Phone',
    'People',
    'Status',
    'Notes',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.preferred_date),
        csvCell(formatExperienceType(r.experience_type)),
        csvCell(r.full_name),
        csvCell(r.email),
        csvCell(r.phone),
        csvCell(r.party_size),
        csvCell((r.status || 'pending')?.toString()),
        csvCell(r.notes ?? ''),
      ].join(',')
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
