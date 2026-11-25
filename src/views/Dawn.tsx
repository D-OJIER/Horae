import { useState } from 'react';
import { SpinDialog, type SpinPreset } from '../components/SpinDialog';
import { ThreadRow } from '../components/ThreadRow';
import { Empty, Header, Section, Stepper } from '../components/ui';
import type { Thread } from '../domain/types';
import { GUARDIANS } from '../guardians';
import { useHorae } from '../context';
import { useViewedDay } from './useViewedDay';

const byHour = (a: Thread, b: Thread) =>
  Number(a.cutAt !== null) - Number(b.cutAt !== null) ||
  (a.horaSlot ?? 99) - (b.horaSlot ?? 99) ||
  a.createdAt - b.createdAt;

export function Dawn() {
  const { threads, today, realm, inMode, pullToDawn, fastForwardMidnight, resetClock, offsetDays } = useHorae();
  const { day, stepper } = useViewedDay();
  const [preset, setPreset] = useState<SpinPreset | null>(null);
  const [showLethe, setShowLethe] = useState(false);
  const olympus = realm === 'olympus';

  const dayThreads = threads
    .filter((t) => t.level !== 'season' && t.date === day && t.realm === realm && inMode(t))
    .sort(byHour);
  const unplanned = threads.filter(
    (t) => t.realm === 'olympus' && t.date === null && t.parentId !== null && t.cutAt === null && inMode(t),
  );
  const labourTitle = (id: string | null) => threads.find((t) => t.id === id)?.title ?? '';
  const forgotten = threads.filter((t) => t.realm === 'lethe' && inMode(t));

  return (
    <>
      <Header
        title={olympus ? 'Dawn' : 'Fallen Dawn'}
        subtitle={olympus ? 'What must happen today' : 'Threads missed on this day'}
      />
      <Stepper {...stepper} />

      <Section
        title={olympus ? 'Threads' : 'Fallen threads'}
        action={
          olympus && day >= today ? (
            <button className="btn small" onClick={() => setPreset({ level: 'dawn', date: day })}>
              + Spin
            </button>
          ) : null
        }
      >
        {dayThreads.length === 0 ? (
          <Empty>{olympus ? 'Nothing spun for this Dawn.' : 'No thread fell on this day.'}</Empty>
        ) : (
          dayThreads.map((t) => <ThreadRow key={t.id} thread={t} />)
        )}
      </Section>

      {olympus && day >= today ? (
        <Section title="Pull from this Season’s Labours">
          {unplanned.length === 0 ? (
            <Empty>No unplanned threads. Spin some from a Labour in the Season view.</Empty>
          ) : (
            unplanned.map((t) => (
              <div key={t.id} className={`thread g-${t.mode}`}>
                <div className="thread-main">
                  <div style={{ flex: 1 }}>
                    {GUARDIANS[t.mode].icon} {t.title}
                    <span className="thread-meta">from {labourTitle(t.parentId)}</span>
                  </div>
                  <button className="btn small" onClick={() => pullToDawn(t.id, day)}>
                    Pull down
                  </button>
                </div>
              </div>
            ))
          )}
        </Section>
      ) : null}

      {!olympus ? (
        <Section
          title={`Lethe archive (${forgotten.length})`}
          action={
            <button className="btn quiet small" aria-expanded={showLethe} onClick={() => setShowLethe((s) => !s)}>
              {showLethe ? 'Hide' : 'Show'}
            </button>
          }
        >
          {showLethe
            ? forgotten.length === 0
              ? <Empty>Nothing forgotten.</Empty>
              : forgotten.map((t) => <ThreadRow key={t.id} thread={t} showDate />)
            : null}
        </Section>
      ) : null}

      <Section title="Demo">
        <p className="note">Move the clock forward to watch unfinished threads descend and Charon arrive.</p>
        <div className="row">
          <button className="btn ghost small" onClick={fastForwardMidnight}>
            ☾ Fast-forward to midnight
          </button>
          {offsetDays !== 0 ? (
            <button className="btn quiet small" onClick={resetClock}>
              Back to the real date
            </button>
          ) : null}
        </div>
      </Section>

      {preset ? <SpinDialog preset={preset} onClose={() => setPreset(null)} /> : null}
    </>
  );
}
