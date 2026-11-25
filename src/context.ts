import { createContext, useContext } from 'react';
import type { DayKey, Level, Mode, Thread } from './domain/types';
import type { SyncStatus } from './sync/useGistSync';

export type ModeFilter = Mode | 'all';
export type ViewRealm = 'olympus' | 'underworld';

export interface SpinInput {
  title: string;
  mode: Mode;
  level: Level;
  date: DayKey | null;
  horaSlot: number | null;
  parentId: string | null;
}

export interface HoraeValue {
  threads: Thread[];
  today: DayKey;
  /** The current hour (0–23), for highlighting "now". */
  hour: number;
  offsetDays: number;
  mode: ModeFilter;
  setMode(m: ModeFilter): void;
  realm: ViewRealm;
  setRealm(r: ViewRealm): void;
  inMode(t: Thread): boolean;
  /** Threads that descended since Charon last came. */
  charonQueue: Thread[];
  charonDue: boolean;

  spin(input: SpinInput): void;
  cut(id: string): void;
  uncut(id: string): void;
  carry(id: string, date: DayKey, horaSlot: number | null): void;
  lethe(id: string): void;
  restore(id: string): void;
  laterSeason(id: string): void;
  split(id: string, titles: string[]): void;
  placeInHora(id: string, slot: number | null): void;
  pullToDawn(id: string, date: DayKey): void;
  finishCharon(): void;
  fastForwardMidnight(): void;
  resetClock(): void;
  sync: {
    connected: boolean;
    gistUrl: string | null;
    status: SyncStatus;
    connect(token: string): Promise<void>;
    disconnect(): void;
    syncNow(): void;
  };
}

export const HoraeContext = createContext<HoraeValue | null>(null);

export function useHorae(): HoraeValue {
  const v = useContext(HoraeContext);
  if (!v) throw new Error('useHorae must be used inside HoraeProvider');
  return v;
}

