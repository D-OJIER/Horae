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
        <p className="kicker"><span>☾</span> Charon’s crossing</p>
        <h1 id="charon-title" className="title">
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
            <svg className="boat" viewBox="0 0 120 60">
              <path d="M4 38h112l-18 16H20Z" />
              <path d="M58 8v30M50 18h8" className="mast" />
              <path d="M70 4 52 58" className="pole" />
            </svg>
          </div>
          <svg className="water" viewBox="0 0 400 40" preserveAspectRatio="none">
            <path d="M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 T250 10 T300 10 T350 10 T400 10 T450 10 T500 10V40H0Z" />
          </svg>
          <span className="styx">S · T · Y · X</span>
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
