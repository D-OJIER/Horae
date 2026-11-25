import { useState } from 'react';
import { Coins, FallenActions } from '../components/ThreadRow';
import { formatDay, formatHora } from '../domain/time';
import type { Thread } from '../domain/types';
import { GUARDIANS } from '../guardians';
import { useHorae } from '../context';

function Soul({ thread }: { thread: Thread }) {
  return (
    <div className={`thread g-${thread.mode}`}>
      <div className="thread-main">
        <div style={{ flex: 1 }}>
          <strong>
            {GUARDIANS[thread.mode].icon} {thread.title}
          </strong>
          <span className="thread-meta">
            {thread.level === 'season' ? 'Labour due ' : 'Fell on '}
            {thread.date ? formatDay(thread.date) : ''}
            {thread.horaSlot !== null ? ` · ${formatHora(thread.horaSlot)}` : ''}
          </span>
        </div>
        <Coins n={thread.crossings} />
      </div>
      <FallenActions thread={thread} />
    </div>
  );
}

/** Charon's crossing: on the first open of each Dawn, decide what happens to last night's fallen threads. */
export function Charon() {
  const { charonQueue, finishCharon } = useHorae();
  // Keep the threads that were aboard when Charon arrived, so the list doesn't grow while you decide.
  const [aboard] = useState(() => new Set(charonQueue.map((t) => t.id)));
  const souls = charonQueue.filter((t) => aboard.has(t.id));
  const judged = aboard.size - souls.length;

  return (
    <div className="charon" role="dialog" aria-modal="true" aria-labelledby="charon-title">
      <div className="page">
        <p className="kicker">CHARON’S CROSSING</p>
        <h1 id="charon-title">
          {souls.length === 0
            ? 'The ferry is empty.'
            : `${souls.length} thread${souls.length === 1 ? '' : 's'} fell in the night.`}
        </h1>
        <p className="subtitle">
          {souls.length > 0
            ? 'Carry each one back to a new Dawn, or let it drink from Lethe and be forgotten without guilt.'
            : judged > 0
              ? `You judged ${judged}. Go plan your Dawn.`
              : 'Nothing to carry today.'}
        </p>
        <div className="river" aria-hidden>
          <div className="bank" />
          <div className="bank far" />
          <div className="ferry">
            <span className="souls">{'✦'.repeat(Math.min(souls.length, 6))}</span>
            <span className="boat">🛶</span>
          </div>
          <div className="water">~ S T Y X ~</div>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {souls.map((t) => (
            <Soul key={t.id} thread={t} />
          ))}
        </div>
      </div>
      <div className="charon-foot">
        <button className="btn" onClick={finishCharon} autoFocus>
          {souls.length === 0 ? 'Begin the Dawn' : 'Decide later (they wait in the Underworld)'}
        </button>
      </div>
    </div>
  );
}
