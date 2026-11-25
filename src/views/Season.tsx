import { useState } from 'react';
import { FallenActions, ThreadRow } from '../components/ThreadRow';
import { SpinDialog, type SpinPreset } from '../components/SpinDialog';
import { Empty, Header, ProgressBar, Section, Stepper } from '../components/ui';
import { labourProgress } from '../domain/rules';
import { addMonths, formatDay, formatMonth, monthOf } from '../domain/time';
import { MODES, type Thread } from '../domain/types';
import { GUARDIANS } from '../guardians';
import { useHorae } from '../context';

function LabourCard({ labour, onSpinChild }: { labour: Thread; onSpinChild(): void }) {
  const { threads, mode, cut, uncut } = useHorae();
  const [open, setOpen] = useState(false);
  const { done, total } = labourProgress(labour, threads);
  const g = GUARDIANS[labour.mode];
  const isCut = labour.cutAt !== null;
  const children = threads
    .filter((t) => t.parentId === labour.id && t.realm !== 'lethe')
    .sort((a, b) => (a.date ?? '9').localeCompare(b.date ?? '9'));

  return (
    <article className={`labour g-${labour.mode}`}>
      <div>
        <p className="note">
          {mode === 'all' ? `${g.icon} ${g.name} · ` : ''}due {formatDay(labour.date!)}
        </p>
        <h3 className={isCut ? 'cut' : ''}>{labour.title}</h3>
      </div>
      <ProgressBar done={done} total={total} />
      <p className="note">{total === 0 ? 'No threads yet' : `${done} of ${total} threads cut`}</p>
      {labour.realm === 'underworld' ? <FallenActions thread={labour} /> : null}
      {open ? children.map((c) => <ThreadRow key={c.id} thread={c} showDate />) : null}
      {labour.realm === 'olympus' ? (
        <div className="row">
          <button className="btn small" onClick={onSpinChild}>
            Spin a thread from this Labour
          </button>
          <button className="btn quiet small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide threads' : `Show threads (${children.length})`}
          </button>
          <button className="btn ghost small" onClick={() => (isCut ? uncut(labour.id) : cut(labour.id))}>
            {isCut ? 'Restore Labour' : 'Cut this Labour'}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function Season() {
  const { threads, today, realm, inMode } = useHorae();
  const [month, setMonth] = useState(() => monthOf(today));
  const [preset, setPreset] = useState<SpinPreset | null>(null);

  const inMonth = (t: Thread) => t.date !== null && monthOf(t.date) === month;
  const labours = threads
    .filter((t) => t.level === 'season' && t.realm === realm && inMonth(t) && inMode(t))
    .sort((a, b) => a.date!.localeCompare(b.date!));
  const fallen = threads.filter((t) => t.realm === 'underworld' && t.level !== 'season' && inMonth(t) && inMode(t));
  const olympus = realm === 'olympus';

  return (
    <>
      <Header
        title={olympus ? 'Season' : 'Fallen Season'}
        subtitle={olympus ? 'Labours for the month' : 'Labours that slipped this month'}
      />
      <Stepper
        label={formatMonth(month)}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
        onReset={month === monthOf(today) ? undefined : () => setMonth(monthOf(today))}
        resetLabel="This month"
      />

      <Section
        title={olympus ? 'Labours' : 'Slipped Labours'}
        action={
          olympus ? (
            <button className="btn small" onClick={() => setPreset({ level: 'season' })}>
              + Spin a Labour
            </button>
          ) : null
        }
      >
        {labours.length === 0 ? (
          <Empty>{olympus ? 'No Labours this Season. Spin one to begin.' : 'No Labour slipped this month.'}</Empty>
        ) : (
          labours.map((l) => (
            <LabourCard
              key={l.id}
              labour={l}
              onSpinChild={() => setPreset({ level: 'dawn', date: null, parentId: l.id, parentTitle: l.title })}
            />
          ))
        )}
      </Section>

      {!olympus ? (
        <Section title="Fallen threads this month">
          {fallen.length === 0 ? <Empty>Nothing fell this month.</Empty> : null}
          {MODES.map((m) => {
            const n = fallen.filter((t) => t.mode === m).length;
            return n === 0 ? null : (
              <p key={m} style={{ margin: 0 }}>
                {GUARDIANS[m].icon} {GUARDIANS[m].name}’s fallen threads: {n}
              </p>
            );
          })}
        </Section>
      ) : null}

      {preset ? <SpinDialog preset={preset} onClose={() => setPreset(null)} /> : null}
    </>
  );
}
