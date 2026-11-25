import { useState } from 'react';
import { addDays, dayLabel } from '../domain/time';
import { useHorae } from '../context';

/** The day the Dawn and Hora views open on: today, or yesterday in the Underworld (nothing has fallen today yet). */
export function useViewedDay() {
  const { today, realm } = useHorae();
  const [offset, setOffset] = useState(0);
  const home = realm === 'underworld' ? addDays(today, -1) : today;
  return {
    day: addDays(home, offset),
    stepper: {
      label: dayLabel(addDays(home, offset), today),
      onPrev: () => setOffset(offset - 1),
      onNext: () => setOffset(offset + 1),
      onReset: offset === 0 ? undefined : () => setOffset(0),
      resetLabel: realm === 'underworld' ? 'Yesterday' : 'Today',
    },
  };
}
