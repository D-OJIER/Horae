import type { ReactNode } from 'react';
import { MODES } from '../domain/types';
import { GUARDIANS } from '../guardians';
import { useHorae, type ModeFilter } from '../context';
import { SyncButton } from './SyncDialog';

/** Title, mode switcher and the Olympus / Underworld toggle. */
export function Header({ index, title, subtitle }: { index: string; title: string; subtitle: string }) {
  const { realm, setRealm, mode, setMode, offsetDays } = useHorae();
  const filters: ModeFilter[] = ['all', ...MODES];
  return (
    <header className="header">
      <div className="header-top">
        <div className="heading">
          <p className="kicker">
            <span>{index}</span> {realm === 'olympus' ? 'Olympus' : 'Underworld'}
          </p>
          <h1 className="title" data-text={title}>
            {title}
          </h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <SyncButton />
      </div>
      <div className="chips" role="group" aria-label="Mode">
        {filters.map((f) => (
          <button key={f} className="chip" aria-pressed={f === mode} onClick={() => setMode(f)}>
            {f === 'all' ? 'All' : `${GUARDIANS[f].icon} ${GUARDIANS[f].name}`}
          </button>
        ))}
      </div>
      <div className="segment" role="group" aria-label="Realm">
        <button aria-pressed={realm === 'olympus'} onClick={() => setRealm('olympus')}>
          ☀︎ Olympus
        </button>
        <button aria-pressed={realm === 'underworld'} onClick={() => setRealm('underworld')}>
          ☾ Underworld
        </button>
      </div>
      {offsetDays !== 0 ? <p className="note">Demo clock: +{offsetDays} day{offsetDays === 1 ? '' : 's'}</p> : null}
    </header>
  );
}

export function Stepper({
  label,
  onPrev,
  onNext,
  onReset,
  resetLabel = 'Today',
}: {
  label: string;
  onPrev(): void;
  onNext(): void;
  onReset?: () => void;
  resetLabel?: string;
}) {
  return (
    <div className="stepper">
      <button className="btn quiet small" onClick={onPrev} aria-label="Previous">
        ‹
      </button>
      <span className="label">{label}</span>
      <button className="btn quiet small" onClick={onNext} aria-label="Next">
        ›
      </button>
      {onReset ? (
        <button className="btn ghost small" onClick={onReset}>
          {resetLabel}
        </button>
      ) : null}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}
