import { useCallback, useEffect, useState } from 'react';
import { toggleDay, type Rite } from '../domain/rites';
import type { DayKey, Mode } from '../domain/types';

const KEY = 'horae.rites.v1';

function load(): Rite[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Rite[]) : [];
  } catch {
    return [];
  }
}

/** Recurring habits, kept in this browser (they are not part of Gist sync yet). */
export function useRites() {
  const [rites, setRites] = useState<Rite[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(rites));
    } catch {
      /* storage unavailable: keep working in memory */
    }
  }, [rites]);

  const add = useCallback((title: string, mode: Mode, days: number[]) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    setRites((rs) => [...rs, { id, title: title.trim(), mode, days: [...days].sort(), done: [], createdAt: Date.now() }]);
  }, []);
  const toggle = useCallback((id: string, day: DayKey) => {
    setRites((rs) => rs.map((r) => (r.id === id ? toggleDay(r, day) : r)));
  }, []);
  const retire = useCallback((id: string) => setRites((rs) => rs.filter((r) => r.id !== id)), []);

  return { rites, add, toggle, retire };
}
