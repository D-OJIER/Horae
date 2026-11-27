import { useEffect, useState } from 'react';
import { useHorae } from './context';
import { HoraeProvider } from './state';
import { Charon } from './views/Charon';
import { Dawn } from './views/Dawn';
import { Hora } from './views/Hora';
import { Rites } from './views/Rites';
import { Horologion } from './components/Horologion';
import { Season } from './views/Season';

const TABS = [
  { id: 'season', label: 'Season', glyph: 'I' },
  { id: 'dawn', label: 'Dawn', glyph: 'II' },
  { id: 'hora', label: 'Hora', glyph: 'III' },
  { id: 'rites', label: 'Rites', glyph: 'IV' },
] as const;
type Tab = (typeof TABS)[number]['id'];

// Tabs live in the URL hash, so the app works from any sub-path (GitHub Pages) with no server rewrites.
const tabFromHash = (): Tab => {
  const h = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'dawn';
};

function Shell() {
  const { mode, realm, charonDue } = useHorae();
  const [tab, setTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.title = charonDue ? 'Charon’s crossing · Horae' : `${TABS.find((t) => t.id === tab)!.label} · Horae`;
  }, [tab, charonDue]);

  // Charon's screen always belongs to the Underworld.
  const shownRealm = charonDue ? 'underworld' : realm;

  return (
    <div className="app" data-mode={mode} data-realm={shownRealm}>
      <div className="grain" aria-hidden />
      {/* An angular slab crosses the screen whenever the view or the realm changes. */}
      <div key={`${tab}-${shownRealm}-${charonDue}`} className="wipe" aria-hidden />
      {charonDue ? (
        <Charon />
      ) : (
        <>
          <Horologion view={tab} />
          <main className="page" key={`${tab}-${shownRealm}`}>
            {tab === 'season' ? <Season /> : tab === 'dawn' ? <Dawn /> : tab === 'hora' ? <Hora /> : <Rites />}
          </main>
          <nav className="tabbar" aria-label="Views">
            {TABS.map((t) => (
              <a key={t.id} href={`#${t.id}`} aria-current={t.id === tab ? 'page' : undefined}>
                <span className="glyph" aria-hidden>
                  {t.glyph}
                </span>
                {t.label}
              </a>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <HoraeProvider>
      <Shell />
    </HoraeProvider>
  );
}
