import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  awaitingCharon,
  carryBackPatch,
  labourProgress,
  laterSeasonPatch,
  needsCouncil,
  shouldDescend,
  underworldHeatmap,
} from './rules';
import { addDays, dayKeyInZone, formatHora, isDayKey, lastDayOfMonth, weekdayIndex } from './time';
import type { Thread } from './types';

const base: Thread = {
  id: 't1',
  userId: 'u',
  title: 'Proofread chapter 2',
  mode: 'athena',
  realm: 'olympus',
  level: 'hora',
  date: '2026-11-24',
  horaSlot: 22,
  crossings: 0,
  parentId: null,
  cutAt: null,
  createdAt: 0,
  descendedAt: null,
};

test('unfinished threads from before today descend', () => {
  assert.equal(shouldDescend(base, '2026-11-25'), true);
  assert.equal(shouldDescend(base, '2026-11-24'), false, 'today is not over yet');
  assert.equal(shouldDescend({ ...base, cutAt: 1 }, '2026-11-25'), false, 'cut threads stay');
  assert.equal(shouldDescend({ ...base, realm: 'underworld' }, '2026-11-25'), false);
  assert.equal(shouldDescend({ ...base, date: null }, '2026-11-25'), false, 'unplanned children stay');
});

test('carrying back counts a crossing and keeps the hour if one is chosen', () => {
  const t: Thread = { ...base, realm: 'underworld', descendedAt: 5 };
  assert.deepEqual(carryBackPatch(t, '2026-11-25', 9), {
    realm: 'olympus',
    date: '2026-11-25',
    horaSlot: 9,
    level: 'hora',
    crossings: 1,
    descendedAt: null,
  });
  assert.equal(carryBackPatch(t, '2026-11-25', null).level, 'dawn');
  assert.equal(carryBackPatch({ ...t, level: 'season' }, '2026-12-31', null).level, 'season');
});

test('Charon holds council at three crossings', () => {
  assert.equal(needsCouncil({ crossings: 2 }), false);
  assert.equal(needsCouncil({ crossings: 3 }), true);
});

test('later Season means end of next month', () => {
  assert.equal(laterSeasonPatch('2026-11-25').date, '2026-12-31');
  assert.equal(laterSeasonPatch('2026-12-10').date, '2027-01-31');
});

test('Labour progress ignores threads in Lethe', () => {
  const labour: Thread = { ...base, id: 'L', level: 'season' };
  const kids: Thread[] = [
    { ...base, id: 'a', parentId: 'L', cutAt: 1 },
    { ...base, id: 'b', parentId: 'L' },
    { ...base, id: 'c', parentId: 'L', realm: 'lethe' },
    { ...base, id: 'd', parentId: 'other', cutAt: 1 },
  ];
  assert.deepEqual(labourProgress(labour, [labour, ...kids]), { done: 1, total: 2 });
});

test('heatmap buckets descended hours by weekday', () => {
  // 2026-11-24 is a Tuesday.
  assert.equal(weekdayIndex('2026-11-24'), 1);
  const grid = underworldHeatmap([
    { ...base, realm: 'underworld', descendedAt: 1 },
    { ...base, id: 'x', realm: 'lethe', descendedAt: 1 },
    { ...base, id: 'y' }, // still in Olympus
    { ...base, id: 'z', realm: 'underworld', descendedAt: 1, horaSlot: null },
  ]);
  assert.equal(grid[1][22], 2);
  assert.equal(grid.flat().reduce((a, b) => a + b, 0), 2);
});

test('awaitingCharon returns only fresh descents, in order', () => {
  const list = awaitingCharon(
    [
      { ...base, id: 'late', realm: 'underworld', descendedAt: 10, horaSlot: 22 },
      { ...base, id: 'early', realm: 'underworld', descendedAt: 10, horaSlot: 8 },
      { ...base, id: 'old', realm: 'underworld', descendedAt: 1 },
    ],
    5,
  );
  assert.deepEqual(
    list.map((t) => t.id),
    ['early', 'late'],
  );
});

test('time helpers', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(lastDayOfMonth('2028-02'), '2028-02-29');
  assert.equal(isDayKey('2026-02-30'), false);
  assert.equal(isDayKey('2026-02-28'), true);
  assert.equal(formatHora(22), '10pm–11pm');
  assert.equal(formatHora(11), '11am–12pm');
  assert.equal(formatHora(23), '11pm–12am');
  // 23:30 UTC on Nov 24 is already Nov 25 in Kolkata.
  assert.equal(dayKeyInZone(new Date('2026-11-24T23:30:00Z'), 'Asia/Kolkata'), '2026-11-25');
  assert.equal(dayKeyInZone(new Date('2026-11-24T23:30:00Z'), 'America/New_York'), '2026-11-24');
});
