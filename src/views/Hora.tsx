import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Heatmap } from '../components/Heatmap';
import { Coins, ThreadRow } from '../components/ThreadRow';
import { Empty, Header, Section, Stepper } from '../components/ui';
import { formatHora } from '../domain/time';
import type { Thread } from '../domain/types';
import { GUARDIANS } from '../guardians';
import { useHorae } from '../context';
import { useViewedDay } from './useViewedDay';

const DRAG_SLOP = 6;
const EDGE = 90;

/** The hour slot under a screen point, if any. */
function slotAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot]');
  return el ? Number(el.dataset.slot) : null;
}

function PlacedThread({ thread }: { thread: Thread }) {
  const { cut, uncut, placeInHora } = useHorae();
  const isCut = thread.cutAt !== null;
  return (
    <div className={`placed g-${thread.mode}`}>
      <button
        className="icon-btn"
        role="checkbox"
        aria-checked={isCut}
        aria-label={isCut ? 'Restore thread' : 'Cut the thread'}
        onClick={() => (isCut ? uncut(thread.id) : cut(thread.id))}
        style={{ color: 'var(--accent)' }}
      >
        {isCut ? '✂' : '○'}
      </button>
      <span className={`name${isCut ? ' cut' : ''}`}>
        {GUARDIANS[thread.mode].icon} {thread.title}
      </span>
      <Coins n={thread.crossings} />
      <button className="icon-btn" aria-label="Take off this hour" onClick={() => placeInHora(thread.id, null)}>
        ✕
      </button>
    </div>
  );
}

export function Hora() {
  const { threads, today, hour, realm, inMode, placeInHora } = useHorae();
  const { day, stepper } = useViewedDay();
  const olympus = realm === 'olympus';

  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ thread: Thread; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const press = useRef<{ thread: Thread; x: number; y: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  const dayThreads = threads.filter((t) => t.level !== 'season' && t.date === day && t.realm === realm && inMode(t));
  const tray = olympus ? dayThreads.filter((t) => t.horaSlot === null && t.cutAt === null) : [];
  const nowHour = day === today ? hour : -1;

  // Olympus opens on the current hour.
  useEffect(() => {
    if (realm !== 'olympus' || nowHour < 0) return;
    document.querySelector(`[data-slot="${Math.max(0, nowHour - 1)}"]`)?.scrollIntoView({ block: 'start' });
  }, [realm, nowHour]);

  const onPointerDown = (t: Thread) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    // A drag may or may not be followed by a click event, so clear the flag on each new press.
    swallowClick.current = false;
    press.current ={ thread: t, x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p) return;
    if (!p.moved && Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > DRAG_SLOP) {
      p.moved = true;
      setSelected(null);
    }
    if (!p.moved) return;
    setDrag({ thread: p.thread, x: e.clientX, y: e.clientY });
    setHover(slotAt(e.clientX, e.clientY));
    // Scroll the page while dragging near the top or bottom edge.
    if (e.clientY < EDGE) window.scrollBy(0, -14);
    else if (e.clientY > window.innerHeight - EDGE - 150) window.scrollBy(0, 14);
  };
  const endPress = (e: ReactPointerEvent<HTMLButtonElement>, drop: boolean) => {
    const p = press.current;
    press.current = null;
    if (p?.moved) {
      swallowClick.current = true;
      const s = drop ? slotAt(e.clientX, e.clientY) : null;
      if (s !== null) placeInHora(p.thread.id, s);
    }
    setDrag(null);
    setHover(null);
  };
  const onChipClick = (t: Thread) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    setSelected((s) => (s === t.id ? null : t.id));
  };
  const placeSelected = (h: number) => {
    if (!selected) return;
    placeInHora(selected, h);
    setSelected(null);
  };

  return (
    <>
      <Header
        title={olympus ? 'Hora' : 'Fallen Hours'}
        subtitle={olympus ? 'Drag threads onto an hour' : 'Where planned hours went undone'}
      />
      <Stepper {...stepper} />

      {olympus ? (
        tray.length === 0 ? (
          <Empty>Every unfinished thread for this Dawn has an hour. Spin more in the Dawn view.</Empty>
        ) : null
      ) : (
        <Section title="Underworld heatmap · all days">
          <Heatmap threads={threads.filter(inMode)} />
        </Section>
      )}

      <div className="timeline" style={{ marginBottom: tray.length > 0 ? 150 : 0 }}>
        {Array.from({ length: 24 }, (_, h) => {
          const items = dayThreads.filter((t) => t.horaSlot === h);
          const cls = ['slot', h === nowHour && 'now', hover === h && 'hover', selected && 'pickable']
            .filter(Boolean)
            .join(' ');
          return (
            <div key={h} className={cls} data-slot={h}>
              <span className="slot-time">{formatHora(h)}</span>
              <div className="slot-body">
                {items.map((t) => (olympus ? <PlacedThread key={t.id} thread={t} /> : <ThreadRow key={t.id} thread={t} />))}
                {hover === h && drag ? <span className="slot-hint">Drop “{drag.thread.title}” here</span> : null}
                {selected && hover === null ? (
                  <button className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => placeSelected(h)}>
                    Place here
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {tray.length > 0 ? (
        <div className="tray">
          <div className="tray-inner">
            <p className="note">
              {selected ? 'Now choose an hour above.' : 'Drag a thread onto an hour, or tap it and then choose an hour.'}
            </p>
            <div className="row">
              {tray.map((t) => (
                <button
                  key={t.id}
                  className={`drag-chip g-${t.mode}${drag?.thread.id === t.id ? ' lifted' : ''}`}
                  aria-pressed={selected === t.id}
                  onPointerDown={onPointerDown(t)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(e) => endPress(e, true)}
                  onPointerCancel={(e) => endPress(e, false)}
                  onClick={() => onChipClick(t)}
                >
                  {GUARDIANS[t.mode].icon} {t.title} <Coins n={t.crossings} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {drag ? (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {GUARDIANS[drag.thread.mode].icon} {drag.thread.title}
        </div>
      ) : null}
    </>
  );
}
