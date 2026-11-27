import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EVERY_DAY, missed, streak, tally, toggleDay, weekDays, weekStart, WEEKDAYS_ONLY, type Rite } from './rites';

const rite = (over: Partial<Rite> = {}): Rite => ({
  id: 'r', title: 'Read', mode: 'hestia', days: EVERY_DAY, done: [], createdAt: 0, ...over,
});

// 2026-11-23 is a Monday.
test('weeks start on Monday', () => {
  assert.equal(weekStart('2026-11-27'), '2026-11-23');
  assert.equal(weekStart('2026-11-23'), '2026-11-23');
  assert.deepEqual(weekDays('2026-11-29'), [
    '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29',
  ]);
});

test('toggling marks and unmarks a day', () => {
  const r = toggleDay(toggleDay(rite(), '2026-11-25'), '2026-11-24');
  assert.deepEqual(r.done, ['2026-11-24', '2026-11-25']);
  assert.deepEqual(toggleDay(r, '2026-11-24').done, ['2026-11-25']);
});

test('an unmarked today does not break the streak', () => {
  const r = rite({ done: ['2026-11-25', '2026-11-26'] });
  assert.equal(streak(r, '2026-11-27', '2026-11-01'), 2);
  assert.equal(streak(toggleDay(r, '2026-11-27'), '2026-11-27', '2026-11-01'), 3);
});

test('a missed due day breaks the streak; non-due days are skipped', () => {
  assert.equal(streak(rite({ done: ['2026-11-24', '2026-11-26'] }), '2026-11-27', '2026-11-01'), 1);
  // Weekdays only: Fri 20th, then Mon 23rd keep the streak across the weekend.
  const r = rite({ days: WEEKDAYS_ONLY, done: ['2026-11-20', '2026-11-23'] });
  assert.equal(streak(r, '2026-11-23', '2026-11-01'), 2);
});

test('tally and missed ignore the future and days before the rite existed', () => {
  const week = weekDays('2026-11-27');
  const r = rite({ done: ['2026-11-24'] });
  assert.deepEqual(tally(r, week, '2026-11-25'), { kept: 1, due: 3 });
  assert.deepEqual(missed(r, week, '2026-11-26', '2026-11-24'), ['2026-11-25']);
});
