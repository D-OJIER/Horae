import { addDays, weekdayIndex } from './time';
import type { DayKey, Mode } from './types';

/** A recurring habit: due on some weekdays, marked done day by day. */
export interface Rite {
  id: string;
  title: string;
  mode: Mode;
  /** Weekdays it recurs on, 0 = Monday … 6 = Sunday. */
  days: number[];
  /** Days it was kept. */
  done: DayKey[];
  createdAt: number;
}

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS_ONLY = [0, 1, 2, 3, 4];

export function isDue(rite: Rite, day: DayKey): boolean {
  return rite.days.includes(weekdayIndex(day));
}

export function isKept(rite: Rite, day: DayKey): boolean {
  return rite.done.includes(day);
}

/** The Monday of the week holding a day. */
export function weekStart(day: DayKey): DayKey {
  return addDays(day, -weekdayIndex(day));
}

export function weekDays(day: DayKey): DayKey[] {
  const start = weekStart(day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Toggle a day's mark, keeping the list sorted. */
export function toggleDay(rite: Rite, day: DayKey): Rite {
  const done = isKept(rite, day) ? rite.done.filter((d) => d !== day) : [...rite.done, day].sort();
  return { ...rite, done };
}

/**
 * Consecutive due days kept, counting back from today. Today only counts once it is kept,
 * so an unmarked today doesn't break the streak yet. Days before the rite existed end it.
 */
export function streak(rite: Rite, today: DayKey, createdDay: DayKey): number {
  if (rite.days.length === 0) return 0;
  let n = 0;
  let day = today;
  if (isDue(rite, day) && !isKept(rite, day)) day = addDays(day, -1);
  for (let i = 0; i < 400 && day >= createdDay; i++, day = addDays(day, -1)) {
    if (!isDue(rite, day)) continue;
    if (!isKept(rite, day)) break;
    n++;
  }
  return n;
}

/** Kept / due over the given days, ignoring days after today. */
export function tally(rite: Rite, days: DayKey[], today: DayKey): { kept: number; due: number } {
  const past = days.filter((d) => d <= today && isDue(rite, d));
  return { kept: past.filter((d) => isKept(rite, d)).length, due: past.length };
}

/** Due days before today that were not kept. */
export function missed(rite: Rite, days: DayKey[], today: DayKey, createdDay: DayKey): DayKey[] {
  return days.filter((d) => d < today && d >= createdDay && isDue(rite, d) && !isKept(rite, d));
}
