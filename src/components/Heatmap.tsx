import { Fragment } from 'react';
import { underworldHeatmap } from '../domain/rules';
import { formatHora, WEEKDAY_NAMES, WEEKDAYS } from '../domain/time';
import type { Thread } from '../domain/types';

/** Where threads most often descend: weekday columns × hour rows. */
export function Heatmap({ threads }: { threads: Thread[] }) {
  const grid = underworldHeatmap(threads);
  const max = Math.max(0, ...grid.flat());

  let worst = { d: 0, h: 0, n: 0 };
  grid.forEach((row, d) => row.forEach((n, h) => n > worst.n && (worst = { d, h, n })));

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <p style={{ margin: 0 }}>
        {worst.n === 0
          ? 'No planned hour has fallen yet. Threads with a Hora show up here when they descend.'
          : `Threads die most on ${WEEKDAY_NAMES[worst.d]}s at ${formatHora(worst.h)} (${worst.n}).`}
      </p>
      <div className="heatmap" role="img" aria-label="Missed threads by weekday and hour">
        <span />
        {WEEKDAYS.map((d) => (
          <span key={d} className="h">
            {d}
          </span>
        ))}
        {Array.from({ length: 24 }, (_, h) => (
          <Fragment key={h}>
            <span className="hour">{h % 3 === 0 ? formatHora(h).split('–')[0] : ''}</span>
            {grid.map((row, d) => {
              const n = row[h];
              return (
                <span
                  key={d}
                  className={`cell${n > 0 ? ' hot' : ''}`}
                  title={`${WEEKDAYS[d]} ${formatHora(h)}: ${n} fallen`}
                  style={n > 0 ? { opacity: 0.3 + 0.7 * (n / max) } : undefined}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
