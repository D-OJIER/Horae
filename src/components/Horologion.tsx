import { useEffect, useRef } from 'react';
import { useHorae } from '../context';
import { lastDayOfMonth, monthOf, parseDay } from '../domain/time';

export type HoroView = 'season' | 'dawn' | 'hora' | 'rites';

const TAU = Math.PI * 2;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
/** Point on a circle; angle 0 is twelve o'clock, clockwise. */
const pt = (r: number, a: number) => [r * Math.sin(a), -r * Math.cos(a)] as const;
const f = (n: number) => n.toFixed(2);

function arc(r: number, a0: number, a1: number): string {
  const [x0, y0] = pt(r, a0);
  const [x1, y1] = pt(r, a1);
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}

function tick(r0: number, r1: number, a: number): string {
  const [x0, y0] = pt(r0, a);
  const [x1, y1] = pt(r1, a);
  return `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
}

// The thread Clotho spins: an Archimedean spiral wound from the centre outward.
const SPIRAL = (() => {
  const turns = 5;
  const steps = 220;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * turns * TAU;
    const [x, y] = pt(6 + (i / steps) * 70, a);
    d += `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
  }
  return d;
})();

const triangle = (r: number, rot: number) =>
  [0, 1, 2].map((i) => pt(r, rot + (i * TAU) / 3).map(f).join(' ')).join('L');

/**
 * The Horologion: Horae's signature object. Three rings for month, day and hour,
 * with the ring of the current view lit. It tilts toward the pointer, turns with scroll,
 * and hangs upside down in the Underworld.
 */
export function Horologion({ view }: { view: HoroView }) {
  const { today, hour, realm } = useHorae();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let px = 0;
    let py = 0;
    const paint = () => {
      frame = 0;
      el.style.setProperty('--px', f(px));
      el.style.setProperty('--py', f(py));
      el.style.setProperty('--scroll', String(Math.round(window.scrollY)));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onPointer = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
      queue();
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', queue, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', queue);
      cancelAnimationFrame(frame);
    };
  }, []);

  const d = parseDay(today);
  const month = d.getMonth();
  const date = d.getDate();
  const daysInMonth = parseDay(lastDayOfMonth(monthOf(today))).getDate();
  const gap = 0.05;

  return (
    <div ref={ref} className="horologion" data-view={view} data-realm={realm} aria-hidden>
      <svg viewBox="-200 -200 400 400">
        <g className="spin-scroll">
          {/* Season: twelve months */}
          <g className="ring ring-season" data-lit={view === 'season' || view === 'rites'}>
            <circle r="194" className="hair" />
            {ROMAN.map((n, i) => {
              const a0 = (i * TAU) / 12 + gap;
              const a1 = ((i + 1) * TAU) / 12 - gap;
              const [tx, ty] = pt(166, (i + 0.5) * (TAU / 12));
              return (
                <g key={n} className={i === month ? 'now' : undefined}>
                  <path d={arc(182, a0, a1)} className="seg" />
                  <text x={f(tx)} y={f(ty)} transform={`rotate(${(i + 0.5) * 30} ${f(tx)} ${f(ty)})`}>
                    {n}
                  </text>
                </g>
              );
            })}
          </g>
          {/* Dawn: the days of this month */}
          <g className="ring ring-dawn" data-lit={view === 'dawn' || view === 'rites'}>
            <circle r="148" className="hair" />
            {Array.from({ length: daysInMonth }, (_, i) => (
              <path
                key={i}
                d={tick(i + 1 === date ? 122 : 136, 148, (i * TAU) / daysInMonth)}
                className={i + 1 === date ? 'tick now' : i % 7 === 0 ? 'tick major' : 'tick'}
              />
            ))}
            <circle r="5" cx={f(pt(114, ((date - 1) * TAU) / daysInMonth)[0])} cy={f(pt(114, ((date - 1) * TAU) / daysInMonth)[1])} className="bead" />
          </g>
          {/* Hora: twenty-four hours, with a hand on the current one */}
          <g className="ring ring-hora" data-lit={view === 'hora' || view === 'rites'}>
            <circle r="100" className="hair" />
            {Array.from({ length: 24 }, (_, h) => (
              <path key={h} d={tick(h % 6 === 0 ? 84 : 92, 100, (h * TAU) / 24)} className={h === hour ? 'tick now' : 'tick'} />
            ))}
            <path d={tick(0, 96, ((hour + 0.5) * TAU) / 24)} className="hand" />
          </g>
          {/* Sacred geometry and the spun thread */}
          <g className="geometry">
            <path d={`M${triangle(100, 0)}Z`} />
            <path d={`M${triangle(100, Math.PI)}Z`} />
            <circle r="50" />
          </g>
          <path d={SPIRAL} className="thread-spiral" />
          <circle r="6" className="core" />
        </g>
      </svg>
    </div>
  );
}
