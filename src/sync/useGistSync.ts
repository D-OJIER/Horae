import { useCallback, useEffect, useRef, useState } from 'react';
import type { Thread } from '../domain/types';
import { GistClient, SyncError } from './gist';
import { mergeDocs, serialize, type SyncDoc, type SyncMeta } from './merge';

const CONFIG_KEY = 'horae.sync.v1';
const PUSH_DELAY = 1500;
const PULL_EVERY = 60_000;

export interface SyncConfig {
  token: string;
  gistId: string;
  gistUrl: string;
}

export type SyncStatus =
  | { state: 'off' }
  | { state: 'syncing' }
  | { state: 'ok'; at: number }
  | { state: 'error'; message: string; kind: SyncError['kind'] };

function loadConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SyncConfig) : null;
  } catch {
    return null;
  }
}
function saveConfig(c: SyncConfig | null) {
  try {
    if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
    else localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* storage unavailable: sync works until the page closes */
  }
}

const asDoc = (threads: Thread[], meta: SyncMeta): SyncDoc => mergeDocs({ version: 1, threads, meta }, null);

/**
 * Keeps local threads in step with a GitHub Gist.
 * Every sync reads the remote copy, merges (newest change per thread wins), applies the
 * result locally, and writes back only if the merge added something the gist lacks.
 */
export function useGistSync({
  threads,
  meta,
  applyRemote,
}: {
  threads: Thread[];
  meta: SyncMeta;
  applyRemote(doc: SyncDoc): void;
}) {
  const [config, setConfig] = useState<SyncConfig | null>(loadConfig);
  const [status, setStatus] = useState<SyncStatus>(() => (loadConfig() ? { state: 'syncing' } : { state: 'off' }));
  /** True once the first sync after opening has finished (or failed), or when sync is off. */
  const [settled, setSettled] = useState(() => loadConfig() === null);

  const latest = useRef({ threads, meta, config, applyRemote });
  const synced = useRef<string | null>(null);
  const running = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    latest.current = { threads, meta, config, applyRemote };
  });

  const run = useCallback(async () => {
    if (!latest.current.config) return;
    if (running.current) {
      // A sync is in flight; run once more when it ends so nothing is missed.
      again.current = true;
      return;
    }
    running.current = true;
    do {
      again.current = false;
      const cfg = latest.current.config;
      if (!cfg) break;
      setStatus({ state: 'syncing' });
      try {
        const client = new GistClient(cfg.token);
        const remote = await client.read(cfg.gistId);
        if (remote) latest.current.applyRemote(remote);
        const merged = mergeDocs(asDoc(latest.current.threads, latest.current.meta), remote);
        const text = serialize(merged);
        if (!remote || text !== serialize(mergeDocs(remote, null))) await client.write(cfg.gistId, merged);
        synced.current = text;
        setStatus({ state: 'ok', at: Date.now() });
      } catch (e) {
        const err = e instanceof SyncError ? e : new SyncError('other', String(e));
        setStatus({ state: 'error', message: err.message, kind: err.kind });
      }
      setSettled(true);
    } while (again.current);
    running.current = false;
  }, []);

  // Sync when connecting, when the tab comes back into view, and every minute while visible.
  useEffect(() => {
    if (!config) return;
    const first = setTimeout(() => void run(), 0);
    const onVisible = () => document.visibilityState === 'visible' && void run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    const id = setInterval(() => document.visibilityState === 'visible' && void run(), PULL_EVERY);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      clearInterval(id);
      clearTimeout(first);
    };
  }, [config, run]);

  // Push shortly after local edits.
  useEffect(() => {
    if (!config || serialize(asDoc(threads, meta)) === synced.current) return;
    const id = setTimeout(() => void run(), PUSH_DELAY);
    return () => clearTimeout(id);
  }, [threads, meta, config, run]);

  const connect = useCallback(async (token: string) => {
    setStatus({ state: 'syncing' });
    try {
      const client = new GistClient(token);
      const { id, url } = await client.findOrCreate(asDoc(latest.current.threads, latest.current.meta));
      const cfg = { token: token.trim(), gistId: id, gistUrl: url };
      saveConfig(cfg);
      synced.current = null;
      latest.current.config = cfg;
      setConfig(cfg);
    } catch (e) {
      const err = e instanceof SyncError ? e : new SyncError('other', String(e));
      setStatus({ state: 'error', message: err.message, kind: err.kind });
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    saveConfig(null);
    latest.current.config = null;
    synced.current = null;
    setConfig(null);
    setStatus({ state: 'off' });
    setSettled(true);
  }, []);

  return { config, status, settled, connect, disconnect, syncNow: run };
}
