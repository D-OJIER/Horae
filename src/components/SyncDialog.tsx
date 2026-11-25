import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useHorae } from '../context';

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Horae%20sync';

function ago(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
}

/** Header button showing sync state; opens the sync dialog. */
export function SyncButton() {
  const { sync } = useHorae();
  const [open, setOpen] = useState(false);
  const s = sync.status;
  const label =
    s.state === 'off' ? 'Sync' : s.state === 'syncing' ? 'Syncing…' : s.state === 'ok' ? 'Synced' : 'Sync issue';
  return (
    <>
      <button
        className={`btn small ${s.state === 'error' ? 'ghost danger' : 'quiet'}`}
        onClick={() => setOpen(true)}
        title={s.state === 'error' ? s.message : 'Sync across devices'}
      >
        {s.state === 'error' ? '⚠︎' : '☁︎'} {label}
      </button>
      {open ? <SyncDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SyncDialog({ onClose }: { onClose(): void }) {
  const { sync } = useHorae();
  const ref = useRef<HTMLDialogElement>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const s = sync.status;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    try {
      await sync.connect(token);
      setToken('');
    } catch {
      /* the error is shown from sync.status */
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="sync-title"
    >
      <form onSubmit={connect}>
        <h2 id="sync-title">Sync across devices</h2>

        {sync.connected ? (
          <>
            <p style={{ margin: 0 }}>
              {s.state === 'ok'
                ? `Synced ${ago(s.at)}.`
                : s.state === 'syncing'
                  ? 'Syncing…'
                  : s.state === 'error'
                    ? s.message
                    : ''}
            </p>
            <p className="note">
              Your threads are kept in a secret gist in your GitHub account
              {sync.gistUrl ? (
                <>
                  {' '}
                  (
                  <a href={sync.gistUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                    open it
                  </a>
                  )
                </>
              ) : null}
              . Use the same token on your other devices to see the same threads.
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={sync.syncNow}>
                Sync now
              </button>
              <button type="button" className="btn quiet" onClick={sync.disconnect}>
                Disconnect this device
              </button>
              <button type="button" className="btn quiet" onClick={() => ref.current?.close()}>
                Close
              </button>
            </div>
            <p className="note">Disconnecting keeps your threads on this device and in the gist.</p>
          </>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              Horae can keep your threads in a secret gist in your own GitHub account, so every device you connect
              sees the same threads. There is no Horae server: this browser talks to GitHub directly.
            </p>
            <ol className="steps">
              <li>
                <a href={TOKEN_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                  Create a GitHub token
                </a>{' '}
                with only the <strong>gist</strong> permission. Pick an expiry you’re happy with.
              </li>
              <li>Paste it below and connect.</li>
              <li>On your other devices, open Horae and paste the same token.</li>
            </ol>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-label="GitHub token"
              placeholder="ghp_… or github_pat_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            {s.state === 'error' ? <p className="error">{s.message}</p> : null}
            <div className="row">
              <button type="submit" className="btn" disabled={busy || !token.trim()} style={{ flex: 1 }}>
                {busy ? 'Connecting…' : 'Connect'}
              </button>
              <button type="button" className="btn quiet" onClick={() => ref.current?.close()}>
                Cancel
              </button>
            </div>
            <p className="note">
              The token is stored only in this browser. A secret gist is unlisted, not encrypted: anyone who has its
              link can read it. Threads you already have here are merged into it.
            </p>
          </>
        )}
      </form>
    </dialog>
  );
}
