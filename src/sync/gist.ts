// Stores Horae's data as one file in a secret GitHub Gist in the user's own account.
// No server of our own: the browser talks to the GitHub API directly with the user's token.
import { parseDoc, serialize, type SyncDoc } from './merge';

export const GIST_FILE = 'horae.json';
const API = 'https://api.github.com';
const DESCRIPTION = 'Horae threads (synced by the Horae app)';

export class SyncError extends Error {
  readonly kind: 'auth' | 'missing' | 'network' | 'other';
  constructor(kind: 'auth' | 'missing' | 'network' | 'other', message: string) {
    super(message);
    this.kind = kind;
  }
}

type Fetch = typeof fetch;

interface GistFile {
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}
interface Gist {
  id: string;
  html_url: string;
  files: Record<string, GistFile | undefined>;
}

export class GistClient {
  private readonly token: string;
  private readonly fetchFn: Fetch;

  constructor(token: string, fetchFn: Fetch = (...args) => fetch(...args)) {
    this.token = token.trim();
    this.fetchFn = fetchFn;
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchFn(`${API}${path}`, {
        ...init,
        // Always read the latest copy; GitHub otherwise lets the browser cache GETs for a minute.
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch {
      throw new SyncError('network', 'Could not reach GitHub. Changes are kept on this device and will sync later.');
    }
    if (res.status === 401) throw new SyncError('auth', 'GitHub rejected the token. Check it, or create a new one.');
    if (res.status === 403) throw new SyncError('auth', 'The token is missing the Gists permission, or GitHub rate-limited it.');
    if (res.status === 404) throw new SyncError('missing', 'The sync gist was not found.');
    if (!res.ok) throw new SyncError('other', `GitHub answered ${res.status}.`);
    return (await res.json()) as T;
  }

  /** Finds this user's Horae gist, or creates a secret one. Returns its id and web address. */
  async findOrCreate(initial: SyncDoc): Promise<{ id: string; url: string }> {
    for (let page = 1; page <= 30; page++) {
      const gists = await this.call<Gist[]>(`/gists?per_page=100&page=${page}`);
      const found = gists.find((g) => g.files[GIST_FILE]);
      if (found) return { id: found.id, url: found.html_url };
      if (gists.length < 100) break;
    }
    const created = await this.call<Gist>('/gists', {
      method: 'POST',
      body: JSON.stringify({ description: DESCRIPTION, public: false, files: { [GIST_FILE]: { content: serialize(initial) } } }),
    });
    return { id: created.id, url: created.html_url };
  }

  /** Reads the document; null if the gist exists but has no Horae file yet. */
  async read(id: string): Promise<SyncDoc | null> {
    const gist = await this.call<Gist>(`/gists/${id}`);
    const file = gist.files[GIST_FILE];
    if (!file) return null;
    let text = file.content ?? '';
    // The API cuts files over about 1 MB; the full text is at raw_url.
    if (file.truncated && file.raw_url) {
      try {
        text = await (await this.fetchFn(file.raw_url, { cache: 'no-store' })).text();
      } catch {
        throw new SyncError('network', 'Could not download the full sync file from GitHub.');
      }
    }
    try {
      return parseDoc(text);
    } catch {
      throw new SyncError('other', 'The sync gist does not contain valid Horae data.');
    }
  }

  async write(id: string, doc: SyncDoc): Promise<void> {
    await this.call<Gist>(`/gists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ files: { [GIST_FILE]: { content: serialize(doc) } } }),
    });
  }
}
