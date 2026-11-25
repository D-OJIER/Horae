# Horae

A to-do app that sorts every task by month, day and hour, and keeps the tasks you missed in a mirror of the same views instead of hiding them.

- **Season / Dawn / Hora**: month, day and hour views. Labours (monthly goals) break down into threads for a day, which you drag onto hour slots.
- **Olympus / Underworld**: the same views for planned and for missed threads. At midnight, unfinished threads descend but keep their original date and hour.
- **Charon's crossing**: on the first open of each day, carry last night's fallen threads back or let them drink from Lethe. After 3 crossings, Charon asks you to split the thread, move it to a later Season, or let it go.
- **Athena / Hestia / Hermes**: work, personal and neutral modes, each with its own look.

It is a static React app (Vite + TypeScript) with no server of its own. Threads are saved in your browser, and can optionally sync across devices through a secret GitHub Gist in your own account.

## Run it locally

```sh
npm install
npm run dev       # http://localhost:5173
```

## Deploy

`npm run build` writes a static site to `dist/`. Asset paths are relative and views use the URL hash (`#season`, `#dawn`, `#hora`), so the same build works at a domain root or under a sub-path.

**Vercel:** import the repository at vercel.com/new. It detects Vite (build command `npm run build`, output `dist`); no settings to change.

**GitHub Pages:** in the repository, open Settings → Pages and set Source to **GitHub Actions**. Every push to `main` then runs [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which tests, builds and publishes to `https://<user>.github.io/Horae/`.

## Use it on several devices

Tap **☁ Sync** at the top of any screen:

1. [Create a GitHub token](https://github.com/settings/tokens/new?scopes=gist&description=Horae%20sync) with only the **gist** permission (a fine-grained token with *Gists: read and write* also works).
2. Paste it and press **Connect**. Horae creates a secret gist named `horae.json`, or finds the one you already have, and merges this device's threads into it.
3. On every other device, open Horae and paste the same token.

After that, each device pulls when it opens, when you come back to the tab, and every minute while it is open. It pushes about two seconds after you change something. If two devices change the same thread, the most recent change wins. Without a connection the app keeps working and syncs when it is back online.

Good to know:

- The token is stored only in that browser. Anyone with the token can read and edit your gists, so give it only the gist permission and an expiry.
- A secret gist is unlisted, not encrypted: anyone who has its link can read it.
- With sync on, the midnight descent waits for the first sync after opening, so a thread you cut on another device overnight isn't marked as missed.

## Demo (about 3 minutes)

1. **Season** → *+ Spin a Labour* → *Spin a thread from this Labour* (a couple of times).
2. **Dawn** → *Pull down* a thread from the Labour.
3. **Hora** → drag a thread from the tray onto an hour (or tap it, then *Place here*).
4. **Dawn** → *☾ Fast-forward to midnight*. Unfinished threads descend and Charon appears.
5. Carry one back. It returns with a crossing coin (● 1×).
6. **Hora** → *☾ Underworld* for the heatmap of where threads fall.

*Back to the real date* resets the demo clock.

## How it fits together

| Path | What it is |
| --- | --- |
| `src/domain/` | Pure rules: descent, crossings, Labour progress, heatmap, dates. Unit-tested. |
| `src/state.tsx` | Threads and preferences in `localStorage`, all actions (spin, cut, carry, Lethe, split…), the demo clock, and the midnight descent. |
| `src/context.ts` | Shared types and the `useHorae()` hook. |
| `src/sync/` | Gist sync: the GitHub API client, the merge rules (newest change per thread wins), and the `useGistSync` hook. |
| `src/views/` | Season, Dawn, Hora and Charon screens. |
| `src/components/` | Header, thread rows, the spin dialog and the heatmap. |
| `src/index.css` | Styles; each guardian and realm sets its own colour tokens. |

### Data model

```ts
Thread {
  id, title,
  mode: 'athena' | 'hestia' | 'hermes',
  realm: 'olympus' | 'underworld' | 'lethe',
  level: 'season' | 'dawn' | 'hora',
  date,        // "YYYY-MM-DD", the original planned day; a Labour's deadline; null = not on a Dawn yet
  horaSlot,    // 0–23, or null
  crossings,   // times Charon carried it back
  parentId,    // the Labour it came from
  cutAt,       // completion time, or null
  createdAt, descendedAt,
  updatedAt,   // last change; sync keeps the newer copy
}
```

**The midnight descent.** A static site cannot run a job at midnight, so the app applies it whenever it opens and when the day changes while it is open. The result is the same: the thread's realm becomes `underworld` and its date and hour are kept. Carrying a thread back is always the user's choice.

## Checks

```sh
npm test          # domain and sync rules (node:test)
npm run lint
npm run build     # includes the TypeScript check
```

## Not built yet

- Smart spinning (Gemini), Oracle's weekly reading, Ambrosia streaks, time-of-day mode auto-switch.
- The heatmap counts a thread's current fallen hour. Once carried back, its earlier miss no longer shows.
