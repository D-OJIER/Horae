import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatHora, isDayKey, lastDayOfMonth, monthOf } from '../domain/time';
import { MODES, type Level, type Mode } from '../domain/types';
import { GUARDIANS } from '../guardians';
import { useHorae } from '../context';

export interface SpinPreset {
  level?: Level;
  date?: string | null;
  parentId?: string | null;
  parentTitle?: string;
}

const LEVELS: { level: Level; label: string }[] = [
  { level: 'season', label: 'Season · a Labour' },
  { level: 'dawn', label: 'Dawn · a day' },
  { level: 'hora', label: 'Hora · an hour' },
];

/** Spin a thread (Clotho) and measure it (Lachesis). Render it only while open. */
export function SpinDialog({ preset, onClose }: { preset: SpinPreset; onClose(): void }) {
  const { today, mode: filter, spin } = useHorae();
  const ref = useRef<HTMLDialogElement>(null);
  const isChild = preset.parentId != null;
  const initialLevel = preset.level ?? 'dawn';
  const defaultDate = (l: Level) => (l === 'season' ? lastDayOfMonth(monthOf(today)) : today);

  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<Mode>(filter === 'all' ? 'athena' : filter);
  const [level, setLevel] = useState<Level>(initialLevel);
  const [date, setDate] = useState(preset.date ?? defaultDate(initialLevel));
  const [unplanned, setUnplanned] = useState(isChild && preset.date === null);
  const [slot, setSlot] = useState(() => Math.min(new Date().getHours() + 1, 23));

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const datelessChild = isChild && unplanned;
  const canSpin = title.trim().length > 0 && (datelessChild || isDayKey(date));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSpin) return;
    spin({
      title,
      mode,
      level,
      date: datelessChild ? null : date,
      horaSlot: level === 'hora' ? slot : null,
      parentId: preset.parentId ?? null,
    });
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="spin-title"
    >
      <form onSubmit={submit}>
        <h2 id="spin-title">Spin a {level === 'season' ? 'Labour' : 'thread'}</h2>
        {isChild ? <p className="note">From the Labour “{preset.parentTitle}”</p> : null}

        <input
          type="text"
          autoFocus
          aria-label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={level === 'season' ? 'Finish the internship report' : 'Write the methodology section'}
        />

        <span className="field-label">Guardian</span>
        <div className="row">
          {MODES.map((m) => (
            <button type="button" key={m} className="chip" aria-pressed={m === mode} onClick={() => setMode(m)}>
              {GUARDIANS[m].icon} {GUARDIANS[m].name} · {GUARDIANS[m].domain}
            </button>
          ))}
        </div>

        {isChild ? (
          <div className="row">
            <button type="button" className="chip" aria-pressed={unplanned} onClick={() => setUnplanned(true)}>
              Pull onto a Dawn later
            </button>
            <button type="button" className="chip" aria-pressed={!unplanned} onClick={() => setUnplanned(false)}>
              Plan a day now
            </button>
          </div>
        ) : (
          <>
            <span className="field-label">Measure</span>
            <div className="row">
              {LEVELS.map((l) => (
                <button
                  type="button"
                  key={l.level}
                  className="chip"
                  aria-pressed={l.level === level}
                  onClick={() => {
                    setLevel(l.level);
                    setDate(defaultDate(l.level));
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </>
        )}

        {!datelessChild ? (
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="field-label">{level === 'season' ? 'Deadline' : 'Dawn'}</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        ) : null}

        {level === 'hora' ? (
          <>
            <span className="field-label">Hora · {formatHora(slot)}</span>
            <div className="hours">
              {Array.from({ length: 24 }, (_, h) => (
                <button
                  type="button"
                  key={h}
                  className="chip"
                  aria-pressed={h === slot}
                  aria-label={formatHora(h)}
                  onClick={() => setSlot(h)}
                >
                  {h}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="row" style={{ marginTop: 4 }}>
          <button type="submit" className="btn" disabled={!canSpin} style={{ flex: 1 }}>
            Spin
          </button>
          <button type="button" className="btn quiet" onClick={() => ref.current?.close()}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
