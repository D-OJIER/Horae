// Pure rules shared by the app and the midnight Cloud Function.
import { addMonths, lastDayOfMonth, monthOf, weekdayIndex } from './time';
import { CROSSING_LIMIT, type DayKey, type Thread, type ThreadPatch } from './types';

/**
 * Should this thread descend now that `today` has begun?
 * Unfinished Olympus threads whose planned day is before today descend.
 * A Labour descends once its deadline has passed.
 */
export function shouldDescend(t: Pick<Thread, 'realm' | 'cutAt' | 'date'>, today: DayKey): boolean {
  return t.realm === 'olympus' && t.cutAt === null && t.date !== null && t.date < today;
}

/** The midnight change: only the realm (plus a timestamp). Date and hour are kept. */
export function descentPatch(now: number): ThreadPatch {
  return { realm: 'underworld', descendedAt: now };
}

/** Charon's crossing: the user picks a new Dawn (and optionally a Hora). */
export function carryBackPatch(t: Thread, date: DayKey, horaSlot: number | null): ThreadPatch {
  return {
    realm: 'olympus',
    date,
    horaSlot,
    level: t.level === 'season' ? 'season' : horaSlot === null ? 'dawn' : 'hora',
    crossings: t.crossings + 1,
    descendedAt: null,
  };
}

/** Has this thread crossed often enough that Charon should ask what to do with it? */
export function needsCouncil(t: Pick<Thread, 'crossings'>): boolean {
  return t.crossings >= CROSSING_LIMIT;
}

/** Move a thread to a later Season as a Labour, due at the end of next month. */
export function laterSeasonPatch(today: DayKey): ThreadPatch {
  return {
    realm: 'olympus',
    level: 'season',
    date: lastDayOfMonth(addMonths(monthOf(today), 1)),
    horaSlot: null,
    parentId: null,
    crossings: 0,
    descendedAt: null,
  };
}

export const lethePatch: ThreadPatch = { realm: 'lethe' };

/** Restore from the Lethe archive back to the Underworld, where it can be carried back. */
export const restorePatch: ThreadPatch = { realm: 'underworld' };

/** A Labour's progress, built from its child threads (threads in Lethe don't count). */
export function labourProgress(labour: Thread, all: Thread[]): { done: number; total: number } {
  const children = all.filter((t) => t.parentId === labour.id && t.realm !== 'lethe');
  return { done: children.filter((t) => t.cutAt !== null).length, total: children.length };
}

/** 7×24 grid (Mon–Sun × hour) counting where planned hours descended. */
export function underworldHeatmap(all: Thread[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const t of all) {
    // Threads later sent to Lethe still count: they were missed at that hour.
    if (t.realm === 'olympus' || t.descendedAt === null) continue;
    if (t.horaSlot === null || t.date === null) continue;
    grid[weekdayIndex(t.date)][t.horaSlot] += 1;
  }
  return grid;
}

/** Threads that descended since the user last met Charon. */
export function awaitingCharon(all: Thread[], since: number): Thread[] {
  return all
    .filter((t) => t.realm === 'underworld' && t.descendedAt !== null && t.descendedAt > since)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.horaSlot ?? -1) - (b.horaSlot ?? -1));
}
