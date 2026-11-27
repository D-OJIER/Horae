import { useState, type FormEvent } from 'react';
import { Empty, Header, Section, Stepper } from '../components/ui';
import { EVERY_DAY, isDue, isKept, missed, streak, tally, weekDays, WEEKDAYS_ONLY, type Rite } from '../domain/rites';
import { addDays, dayKey, formatDay, parseDay, WEEKDAYS } from '../domain/time';
import { MODES, type Mode } from '../domain/types';
import { GUARDIANS } from '../guardians';
import { useHorae } from '../context';
import { useRites } from '../rites/useRites';

const createdDay = (r: Rite) => dayKey(new Date(r.createdAt));
const shortDay = (d: string) => parseDay(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function NewRite({ onAdd }: { onAdd(title: string, mode: Mode, days: number[]): void }) {
  const { mode: filter } = useHorae();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<Mode>(filter === 'all' ? 'hestia' : filter);
  const [days, setDays] = useState<number[]>(EVERY_DAY);
  const flip = (d: number) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || days.length === 0) return;
    onAdd(title, mode, days);
    setTitle('');
  };
  return (
    <form className="rite-form" onSubmit={submit}>
      <input type="text" aria-label="New rite" placeholder="Read 20 pages" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="row" role="group" aria-label="Guardian">
        {MODES.map((m) => (
          <button type="button" key={m} className="chip" aria-pressed={m === mode} onClick={() => setMode(m)}>
            {GUARDIANS[m].icon} {GUARDIANS[m].name}
          </button>
        ))}
      </div>
      <div className="row" role="group" aria-label="Repeats on">
        {WEEKDAYS.map((w, i) => (
          <button type="button" key={w} className="chip day" aria-pressed={days.includes(i)} onClick={() => flip(i)}>
            {w}
          </button>
        ))}
        <button type="button" className="btn quiet small" onClick={() => setDays(EVERY_DAY)}>Daily</button>
        <button type="button" className="btn quiet small" onClick={() => setDays(WEEKDAYS_ONLY)}>Weekdays</button>
      </div>
      <button type="submit" className="btn" disabled={!title.trim() || days.length === 0}>
        + Bind a rite
      </button>
    </form>
  );
}

/** Rites: a weekly sheet of recurring habits. Olympus keeps them; the Underworld shows the days they were broken. */
export function Rites() {
  const { today, realm, mode } = useHorae();
  const { rites, add, toggle, retire } = useRites();
  const [week, setWeek] = useState(0);
  const olympus = realm === 'olympus';
  const days = weekDays(addDays(today, week * 7));
  const shown = rites.filter((r) => mode === 'all' || r.mode === mode);

  const totals = shown.reduce(
    (acc, r) => {
      const t = tally(r, days, today);
      return { kept: acc.kept + t.kept, due: acc.due + t.due };
    },
    { kept: 0, due: 0 },
  );

  return (
    <>
      <Header
        index="IV"
        title={olympus ? 'Rites' : 'Broken Rites'}
        subtitle={olympus ? 'What returns, every week' : 'The days a rite went unkept'}
      />
      <Stepper
        label={`${shortDay(days[0])} – ${shortDay(days[6])}`}
        onPrev={() => setWeek(week - 1)}
        onNext={() => setWeek(week + 1)}
        onReset={week === 0 ? undefined : () => setWeek(0)}
        resetLabel="This week"
      />

      {shown.length > 0 && totals.due > 0 ? (
        <p className="rite-tally" aria-live="polite">
          <strong>{totals.kept}</strong>
          <span>/ {totals.due} kept this week</span>
        </p>
      ) : null}

      <Section title={olympus ? 'The sheet' : 'Broken this week'}>
        {shown.length === 0 ? (
          <Empty>No rites bound yet. Bind one below: something you want to return to every week.</Empty>
        ) : olympus ? (
          <div className="sheet-grid" role="table" aria-label="Habit sheet">
            <div className="sheet-row head" role="row">
              <span role="columnheader">Rite</span>
              {days.map((d, i) => (
                <span key={d} role="columnheader" className={d === today ? 'today' : undefined}>
                  {WEEKDAYS[i].slice(0, 2)}
                  <small>{parseDay(d).getDate()}</small>
                </span>
              ))}
            </div>
            {shown.map((r) => {
              const s = streak(r, today, createdDay(r));
              return (
                <div key={r.id} className={`sheet-row g-${r.mode}`} role="row">
                  <span role="rowheader" className="rite-name">
                    <span>{mode === 'all' ? `${GUARDIANS[r.mode].icon} ` : ''}{r.title}</span>
                    <small>
                      {s > 0 ? `${s} in a row` : 'no streak'}
                      <button className="icon-btn" aria-label={`Retire ${r.title}`} onClick={() => confirm(`Retire “${r.title}”? Its marks are deleted.`) && retire(r.id)}>✕</button>
                    </small>
                  </span>
                  {days.map((d) => {
                    if (!isDue(r, d)) return <span key={d} role="cell" className="cell off" aria-label="Rest day" />;
                    const kept = isKept(r, d);
                    const late = d < today && !kept && d >= createdDay(r);
                    return (
                      <span key={d} role="cell">
                        <button
                          className={`cell${kept ? ' kept' : ''}${late ? ' late' : ''}${d === today ? ' today' : ''}`}
                          aria-pressed={kept}
                          disabled={d > today}
                          aria-label={`${r.title}, ${formatDay(d)}`}
                          onClick={() => toggle(r.id, d)}
                        >
                          {kept ? '✦' : late ? '✕' : ''}
                        </button>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          shown.map((r) => {
            const lost = missed(r, days, today, createdDay(r));
            return (
              <div key={r.id} className={`thread g-${r.mode}`}>
                <div className="thread-main">
                  <div style={{ flex: 1 }}>
                    {GUARDIANS[r.mode].icon} {r.title}
                    <span className="thread-meta">
                      {lost.length === 0 ? 'Unbroken this week' : lost.map(shortDay).join(' · ')}
                    </span>
                  </div>
                  {lost.length > 0 ? <span className="coins warn">✕ {lost.length}</span> : null}
                </div>
                {lost.length > 0 ? (
                  <div className="row">
                    {lost.map((d) => (
                      <button key={d} className="btn quiet small" onClick={() => toggle(r.id, d)}>
                        Mark {shortDay(d)} kept
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </Section>

      {olympus ? (
        <Section title="Bind a new rite">
          <NewRite onAdd={add} />
        </Section>
      ) : null}
      <p className="note">Rites are kept in this browser only for now; they don’t sync through the Gist.</p>
    </>
  );
}
