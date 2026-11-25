import type { DayKey } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day of a Date. */
export function dayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The calendar day of an instant in a given IANA time zone (used by the Cloud Function). */
export function dayKeyInZone(instant: Date, timeZone: string): DayKey {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isDayKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return dayKey(parseDay(s)) === s;
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** "YYYY-MM" for a day. */
export function monthOf(key: DayKey): string {
  return key.slice(0, 7);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function lastDayOfMonth(month: string): DayKey {
  const [y, m] = month.split('-').map(Number);
  return dayKey(new Date(y, m, 0));
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DayKey): number {
  return (parseDay(key).getDay() + 6) % 7;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatDay(key: DayKey): string {
  return parseDay(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** "Today · Wednesday, Nov 25", "Yesterday · …", or just the day. */
export function dayLabel(key: DayKey, today: DayKey): string {
  if (key === today) return `Today · ${formatDay(key)}`;
  if (key === addDays(today, -1)) return `Yesterday · ${formatDay(key)}`;
  return formatDay(key);
}

export function formatHora(slot: number): string {
  const label = (h: number) => {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${h < 12 || h === 24 ? 'am' : 'pm'}`;
  };
  return `${label(slot)}–${label(slot + 1)}`;
}
