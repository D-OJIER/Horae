// Core Horae vocabulary. See README for the myth glossary.

export type Mode = 'athena' | 'hestia' | 'hermes';
export type Realm = 'olympus' | 'underworld' | 'lethe';
export type Level = 'season' | 'dawn' | 'hora';

/** A local calendar day, "YYYY-MM-DD". Stored as a string so it never shifts with time zones. */
export type DayKey = string;

export interface Thread {
  id: string;
  userId: string;
  title: string;
  mode: Mode;
  realm: Realm;
  level: Level;
  /**
   * Original planned day. Never changed on descent.
   * For a Labour (season level) this is its deadline.
   * null = a Labour's child that has not been pulled onto a Dawn yet.
   */
  date: DayKey | null;
  /** 0–23 for hora threads, null otherwise. */
  horaSlot: number | null;
  /** Times Charon carried it back. */
  crossings: number;
  /** The Labour it came from. */
  parentId: string | null;
  /** Completion time (ms since epoch), null if not done. */
  cutAt: number | null;
  /** When it was spun (ms since epoch). */
  createdAt: number;
  /** When it last descended to the Underworld (ms since epoch). */
  descendedAt: number | null;
  /** Last change (ms since epoch). Sync keeps the newer copy of each thread. Older data may lack it. */
  updatedAt?: number;
}

/** Fields a store write may change. */
export type ThreadPatch = Partial<Omit<Thread, 'id' | 'userId'>>;

export const MODES: Mode[] = ['athena', 'hestia', 'hermes'];

/** When a thread has crossed this many times, Charon asks you to split, defer or forget it. */
export const CROSSING_LIMIT = 3;
