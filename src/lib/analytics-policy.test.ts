import test from 'node:test';
import assert from 'node:assert/strict';
import { dateRange, isBot } from './analytics-policy.ts';
test('default reporting window follows Vietnam date at UTC boundary', () => {
  assert.deepEqual(dateRange(new URLSearchParams(), new Date('2026-11-04T18:00:00Z')), { start:'2026-10-07', end:'2026-11-05' });
});
test('reject invalid, reversed, future and oversized ranges', () => {
  for (const value of ['start=2026-02-30','start=2026-11-05&end=2026-11-04','end=2027-01-01','start=2020-01-01'])
    assert.throws(()=>dateRange(new URLSearchParams(value),new Date('2026-11-04T10:00:00Z')));
});
test('known bot agents are excluded from visits', () => {
  assert.equal(isBot('Googlebot'),true);
  assert.equal(isBot('Mozilla/5.0 Chrome/130'),false);
});
