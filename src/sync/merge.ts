import type { DayKey, Thread } from '../domain/types';

/** Charon's state, shared so a crossing done on one device isn't repeated on another. */
export interface SyncMeta {
  lastCharonAt: number;
  charonSeenDay: DayKey | null;
}

/** The whole synced document, stored as one JSON file. */
export interface SyncDoc {
  version: 1;
  threads: Thread[];
  meta: SyncMeta;
}

export const stamp = (t: Thread): number => t.updatedAt ?? t.createdAt;

/**
 * Merges two thread lists by id, keeping the more recently changed copy.
 * Threads are never deleted (Lethe is a realm), so no tombstones are needed.
 * The result is sorted by id so equal content always serializes the same way.
 */
export function mergeThreads(a: Thread[], b: Thread[]): Thread[] {
  const byId = new Map<string, Thread>();
  for (const t of [...a, ...b]) {
    const seen = byId.get(t.id);
    if (!seen || stamp(t) > stamp(seen)) byId.set(t.id, t);
  }
  return [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

export function mergeMeta(a: SyncMeta, b: SyncMeta | undefined): SyncMeta {
  if (!b) return a;
  return {
    lastCharonAt: Math.max(a.lastCharonAt, b.lastCharonAt),
    charonSeenDay:
      a.charonSeenDay === null ? b.charonSeenDay : b.charonSeenDay === null ? a.charonSeenDay : a.charonSeenDay > b.charonSeenDay ? a.charonSeenDay : b.charonSeenDay,
  };
}

export function mergeDocs(local: SyncDoc, remote: SyncDoc | null): SyncDoc {
  if (!remote) return { ...local, threads: mergeThreads(local.threads, []) };
  return { version: 1, threads: mergeThreads(local.threads, remote.threads), meta: mergeMeta(local.meta, remote.meta) };
}

export const serialize = (doc: SyncDoc): string => JSON.stringify(doc);

/** Reads a document, tolerating missing fields from older versions. */
export function parseDoc(text: string): SyncDoc {
  const raw = JSON.parse(text) as Partial<SyncDoc>;
  return {
    version: 1,
    threads: Array.isArray(raw.threads) ? raw.threads : [],
    meta: { lastCharonAt: raw.meta?.lastCharonAt ?? 0, charonSeenDay: raw.meta?.charonSeenDay ?? null },
  };
}
