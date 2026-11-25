import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  awaitingCharon,
  carryBackPatch,
  descentPatch,
  laterSeasonPatch,
  lethePatch,
  restorePatch,
  shouldDescend,
} from './domain/rules';
import { dayKey } from './domain/time';
import type { DayKey, Thread, ThreadPatch } from './domain/types';
import { HoraeContext, type HoraeValue, type ModeFilter, type SpinInput } from './context';
import { mergeMeta, mergeThreads, type SyncDoc } from './sync/merge';
import { useGistSync } from './sync/useGistSync';

const THREADS_KEY = 'horae.threads.v1';
const PREFS_KEY = 'horae.prefs.v1';
const DAY_MS = 24 * 60 * 60 * 1000;

interface Prefs {
  mode: ModeFilter;
  /** Demo clock: days added to the real date ("fast-forward to midnight"). */
  offsetDays: number;
  /** Last time the user finished Charon's crossing (ms). */
  lastCharonAt: number;
  /** The Dawn on which Charon last appeared. */
  charonSeenDay: DayKey | null;
}

const DEFAULT_PREFS: Prefs = { mode: 'all', offsetDays: 0, lastCharonAt: 0, charonSeenDay: null };

// Browser storage can be missing or blocked (private windows, previews); the app still works in memory.
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function freshThread(input: SpinInput): Thread {
  const now = Date.now();
  return {
    ...input,
    title: input.title.trim(),
    id: newId(),
    userId: 'local',
    realm: 'olympus',
    crossings: 0,
    cutAt: null,
    createdAt: now,
    descendedAt: null,
    updatedAt: now,
  };
}

/** Applies the midnight descent to a list; returns the same list if nothing descended. */
function descend(threads: Thread[], today: DayKey): Thread[] {
  if (!threads.some((t) => shouldDescend(t, today))) return threads;
  const now = Date.now();
  const patch = { ...descentPatch(now), updatedAt: now };
  return threads.map((t) => (shouldDescend(t, today) ? { ...t, ...patch } : t));
}

const todayFor = (now: number, offsetDays: number) => dayKey(new Date(now + offsetDays * DAY_MS));

export function HoraeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...DEFAULT_PREFS, ...load(PREFS_KEY, {}) }));
  const [now, setNow] = useState(() => Date.now());
  const today = todayFor(now, prefs.offsetDays);
  const [threads, setThreads] = useState<Thread[]>(() => load<Thread[]>(THREADS_KEY, []));
  const [realm, setRealm] = useState<'olympus' | 'underworld'>('olympus');

  // Another device's changes arrive here: keep the newer copy of every thread.
  const applyRemote = useCallback((doc: SyncDoc) => {
    setThreads((ts) => mergeThreads(ts, doc.threads));
    setPrefs((p) => {
      const m = mergeMeta({ lastCharonAt: p.lastCharonAt, charonSeenDay: p.charonSeenDay }, doc.meta);
      return m.lastCharonAt === p.lastCharonAt && m.charonSeenDay === p.charonSeenDay ? p : { ...p, ...m };
    });
  }, [setThreads, setPrefs]);
  const meta = useMemo(
    () => ({ lastCharonAt: prefs.lastCharonAt, charonSeenDay: prefs.charonSeenDay }),
    [prefs.lastCharonAt, prefs.charonSeenDay],
  );
  const sync = useGistSync({ threads, meta, applyRemote });
  const { config: syncConfig, status: syncStatus, connect, disconnect, syncNow } = sync;

  useEffect(() => save(THREADS_KEY, threads), [threads]);
  useEffect(() => save(PREFS_KEY, prefs), [prefs]);

  // Notice the real midnight while the app stays open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // The midnight descent: whenever a Dawn has begun, unfinished threads from earlier days descend.
  // With sync on, wait for the first sync after opening, so a thread cut on another device
  // overnight is not marked as missed here.
  // (Adjusting state during render: React re-renders at once, and descend() leaves nothing due.)
  if (sync.settled && threads.some((t) => shouldDescend(t, today))) setThreads(descend(threads, today));

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THREADS_KEY && e.newValue) setThreads(JSON.parse(e.newValue));
      if (e.key === PREFS_KEY && e.newValue) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(e.newValue) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const patch = useCallback((id: string, p: ThreadPatch | ((t: Thread) => ThreadPatch)) => {
    setThreads((ts) =>
      ts.map((t) => (t.id === id ? { ...t, ...(typeof p === 'function' ? p(t) : p), updatedAt: Date.now() } : t)),
    );
  }, [setThreads]);

  const value = useMemo<HoraeValue>(() => {
    const updatePrefs = (p: Partial<Prefs>) => setPrefs((old) => ({ ...old, ...p }));
    const charonQueue = awaitingCharon(threads, prefs.lastCharonAt);
    return {
      threads,
      today,
      hour: new Date(now).getHours(),
      offsetDays: prefs.offsetDays,
      mode: prefs.mode,
      setMode: (m) => updatePrefs({ mode: m }),
      realm,
      setRealm,
      inMode: (t) => prefs.mode === 'all' || t.mode === prefs.mode,
      charonQueue,
      charonDue: charonQueue.length > 0 && prefs.charonSeenDay !== today,

      spin: (input) => setThreads((ts) => [...ts, freshThread(input)]),
      cut: (id) => patch(id, { cutAt: Date.now() }),
      uncut: (id) => patch(id, { cutAt: null }),
      carry: (id, date, slot) => patch(id, (t) => carryBackPatch(t, date, slot)),
      lethe: (id) => patch(id, lethePatch),
      restore: (id) => patch(id, restorePatch),
      laterSeason: (id) => patch(id, laterSeasonPatch(today)),
      split: (id, titles) =>
        setThreads((ts) => {
          const t = ts.find((x) => x.id === id);
          if (!t) return ts;
          // Smaller threads land on today's Dawn under the same Labour; the original is forgotten.
          const parts = titles.map((title) =>
            freshThread({ title, mode: t.mode, level: 'dawn', date: today, horaSlot: null, parentId: t.parentId }),
          );
          return [...ts.map((x) => (x.id === id ? { ...x, ...lethePatch, updatedAt: Date.now() } : x)), ...parts];
        }),
      placeInHora: (id, slot) => patch(id, { horaSlot: slot, level: slot === null ? 'dawn' : 'hora' }),
      pullToDawn: (id, date) => patch(id, { date }),
      finishCharon: () => updatePrefs({ lastCharonAt: Date.now(), charonSeenDay: today }),
      fastForwardMidnight: () => updatePrefs({ offsetDays: prefs.offsetDays + 1 }),
      resetClock: () => updatePrefs({ offsetDays: 0 }),
      sync: {
        connected: syncConfig !== null,
        gistUrl: syncConfig?.gistUrl ?? null,
        status: syncStatus,
        connect,
        disconnect,
        syncNow: () => void syncNow(),
      },
    };
  }, [threads, prefs, today, now, realm, patch, syncConfig, syncStatus, connect, disconnect, syncNow, setThreads, setRealm]);

  return <HoraeContext.Provider value={value}>{children}</HoraeContext.Provider>;
}
