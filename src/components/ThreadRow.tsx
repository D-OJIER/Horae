import { useState } from 'react';
import { needsCouncil } from '../domain/rules';
import { formatHora } from '../domain/time';
import { CROSSING_LIMIT, type Thread } from '../domain/types';
import { GUARDIANS } from '../guardians';
import { useHorae } from '../context';

/** Crossing coins: one ● per time Charon carried it. */
export function Coins({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className={`coins${n >= CROSSING_LIMIT ? ' warn' : ''}`} title={`Carried ${n} times`}>
      {'●'.repeat(Math.min(n, 5))} {n}×
    </span>
  );
}

/**
 * What can be done with a fallen thread: carry it back, or, after three crossings,
 * split it, move it to a later Season, or let it go.
 */
export function FallenActions({ thread }: { thread: Thread }) {
  const { carry, lethe, laterSeason, split, today } = useHorae();
  const [splitting, setSplitting] = useState(false);
  const [parts, setParts] = useState('');

  if (splitting) {
    const titles = parts.split('\n').map((s) => s.trim()).filter(Boolean);
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <label className="note" htmlFor={`split-${thread.id}`}>
          Split into smaller threads, one per line:
        </label>
        <textarea
          id={`split-${thread.id}`}
          rows={3}
          autoFocus
          value={parts}
          onChange={(e) => setParts(e.target.value)}
          placeholder={`${thread.title}: first step\n${thread.title}: second step`}
        />
        <div className="row">
          <button className="btn small" disabled={titles.length < 2} onClick={() => split(thread.id, titles)}>
            Spin {titles.length >= 2 ? titles.length : ''} onto today
          </button>
          <button className="btn quiet small" onClick={() => setSplitting(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (thread.level !== 'season' && needsCouncil(thread)) {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <p className="note" style={{ fontSize: 13 }}>
          Charon has carried this {thread.crossings} times. Make it smaller, give it more time, or let it go.
        </p>
        <div className="row">
          <button className="btn small" onClick={() => setSplitting(true)}>
            Split it
          </button>
          <button className="btn quiet small" onClick={() => laterSeason(thread.id)}>
            Later Season
          </button>
          <button className="btn quiet small" onClick={() => lethe(thread.id)}>
            Drink from Lethe
          </button>
        </div>
      </div>
    );
  }

  const slot = thread.horaSlot;
  return (
    <div className="row">
      {thread.level === 'season' ? (
        <button className="btn small" onClick={() => laterSeason(thread.id)}>
          Carry to a later Season
        </button>
      ) : (
        <>
          <button className="btn small" onClick={() => carry(thread.id, today, slot)}>
            {slot !== null ? `Carry to today, ${formatHora(slot)}` : 'Carry to today'}
          </button>
          {slot !== null ? (
            <button className="btn quiet small" onClick={() => carry(thread.id, today, null)}>
              Today, no hour
            </button>
          ) : null}
        </>
      )}
      <button className="btn quiet small" onClick={() => lethe(thread.id)}>
        Drink from Lethe
      </button>
    </div>
  );
}

export function ThreadRow({ thread, showDate }: { thread: Thread; showDate?: boolean }) {
  const { mode, cut, uncut, restore, lethe } = useHorae();
  const [open, setOpen] = useState(false);
  const g = GUARDIANS[thread.mode];
  const isCut = thread.cutAt !== null;
  const meta = [
    thread.horaSlot !== null ? formatHora(thread.horaSlot) : null,
    showDate ? (thread.date ?? 'Not on a Dawn yet') : null,
  ].filter(Boolean);

  return (
    <div className={`thread g-${thread.mode}`}>
      <div className="thread-main">
        {thread.realm === 'olympus' ? (
          <button
            className="check"
            role="checkbox"
            aria-checked={isCut}
            aria-label={isCut ? 'Restore thread' : 'Cut the thread'}
            onClick={() => (isCut ? uncut(thread.id) : cut(thread.id))}
          >
            {isCut ? '✂' : ''}
          </button>
        ) : null}
        <button className={`thread-title${isCut ? ' cut' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {mode === 'all' ? `${g.icon} ` : ''}
          {thread.title}
          {meta.length > 0 ? <span className="thread-meta">{meta.join(' · ')}</span> : null}
        </button>
        <Coins n={thread.crossings} />
      </div>
      {open && thread.realm === 'underworld' ? <FallenActions thread={thread} /> : null}
      {open && thread.realm === 'lethe' ? (
        <div className="row">
          <button className="btn small" onClick={() => restore(thread.id)}>
            Restore to the Underworld
          </button>
        </div>
      ) : null}
      {open && thread.realm === 'olympus' && !isCut ? (
        <div className="row">
          <button className="btn quiet small" onClick={() => lethe(thread.id)}>
            Drink from Lethe
          </button>
        </div>
      ) : null}
    </div>
  );
}
