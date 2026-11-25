import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Thread } from '../domain/types';
import { GIST_FILE, GistClient, SyncError } from './gist';
import { mergeDocs, mergeMeta, mergeThreads, parseDoc, type SyncDoc } from './merge';

const t = (id: string, updatedAt: number, extra: Partial<Thread> = {}): Thread => ({
  id,
  userId: 'local',
  title: id,
  mode: 'athena',
  realm: 'olympus',
  level: 'dawn',
  date: '2026-11-25',
  horaSlot: null,
  crossings: 0,
  parentId: null,
  cutAt: null,
  createdAt: 1,
  descendedAt: null,
  updatedAt,
  ...extra,
});

test('merge keeps the newer copy of each thread and the union of both sides', () => {
  const phone = [t('a', 10, { cutAt: 10 }), t('b', 5)];
  const laptop = [t('a', 7, { realm: 'underworld' }), t('c', 3)];
  const merged = mergeThreads(phone, laptop);
  assert.deepEqual(merged.map((x) => x.id), ['a', 'b', 'c']);
  assert.equal(merged[0].cutAt, 10, 'the cut made later on the phone wins');
  assert.equal(merged[0].realm, 'olympus');
  assert.deepEqual(mergeThreads(laptop, phone), merged, 'order of arguments does not matter');
});

test('threads without updatedAt fall back to createdAt', () => {
  const old = { ...t('a', 0), updatedAt: undefined, createdAt: 50 };
  assert.equal(mergeThreads([old], [t('a', 40)])[0].updatedAt, undefined);
  assert.equal(mergeThreads([old], [t('a', 60)])[0].updatedAt, 60);
});

test('meta keeps the latest Charon crossing', () => {
  assert.deepEqual(
    mergeMeta({ lastCharonAt: 5, charonSeenDay: '2026-11-25' }, { lastCharonAt: 9, charonSeenDay: '2026-11-24' }),
    { lastCharonAt: 9, charonSeenDay: '2026-11-25' },
  );
  assert.deepEqual(mergeMeta({ lastCharonAt: 0, charonSeenDay: null }, { lastCharonAt: 0, charonSeenDay: '2026-11-24' }), {
    lastCharonAt: 0,
    charonSeenDay: '2026-11-24',
  });
});

test('parseDoc tolerates missing fields', () => {
  assert.deepEqual(parseDoc('{}'), { version: 1, threads: [], meta: { lastCharonAt: 0, charonSeenDay: null } });
});

/** A tiny in-memory stand-in for the GitHub Gists API. */
function fakeGitHub(token = 'good') {
  const gists = new Map<string, Record<string, { content: string }>>();
  let next = 1;
  const calls: string[] = [];
  const fetchFn = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace('https://api.github.com', '');
    calls.push(`${method} ${path}`);
    const auth = (init.headers as Record<string, string>).Authorization;
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    if (auth !== `Bearer ${token}`) return json(401, { message: 'Bad credentials' });
    const view = (id: string) => ({
      id,
      html_url: `https://gist.github.com/${id}`,
      files: Object.fromEntries(Object.entries(gists.get(id)!).map(([k, v]) => [k, { ...v, truncated: false }])),
    });
    if (method === 'GET' && path.startsWith('/gists?')) return json(200, [...gists.keys()].map(view));
    if (method === 'POST' && path === '/gists') {
      const id = `g${next++}`;
      gists.set(id, JSON.parse(String(init.body)).files);
      return json(201, view(id));
    }
    const id = path.split('/')[2];
    if (!gists.has(id)) return json(404, { message: 'Not Found' });
    if (method === 'PATCH') {
      Object.assign(gists.get(id)!, JSON.parse(String(init.body)).files);
      return json(200, view(id));
    }
    return json(200, view(id));
  }) as typeof fetch;
  return { fetchFn, gists, calls };
}

const doc = (threads: Thread[]): SyncDoc => ({ version: 1, threads, meta: { lastCharonAt: 0, charonSeenDay: null } });

test('two devices with the same token find the same gist and converge', async () => {
  const gh = fakeGitHub();
  const phone = new GistClient('good', gh.fetchFn);
  const laptop = new GistClient('good', gh.fetchFn);

  const first = await phone.findOrCreate(doc([t('a', 1)]));
  const second = await laptop.findOrCreate(doc([t('b', 1)]));
  assert.equal(second.id, first.id, 'the laptop reuses the phone’s gist instead of making another');
  assert.equal(gh.gists.size, 1);

  // The laptop syncs: read, merge its local thread in, write back.
  const remote = await laptop.read(second.id);
  await laptop.write(second.id, mergeDocs(doc([t('b', 1)]), remote));
  // The phone then sees both.
  const seen = await phone.read(first.id);
  assert.deepEqual(seen!.threads.map((x) => x.id), ['a', 'b']);
  assert.ok(gh.gists.get(first.id)![GIST_FILE]);
});

test('errors are reported in plain terms', async () => {
  const gh = fakeGitHub();
  await assert.rejects(new GistClient('wrong', gh.fetchFn).findOrCreate(doc([])), (e: SyncError) => e.kind === 'auth');
  await assert.rejects(new GistClient('good', gh.fetchFn).read('nope'), (e: SyncError) => e.kind === 'missing');
  const offline = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  await assert.rejects(new GistClient('good', offline).read('x'), (e: SyncError) => e.kind === 'network');
});
