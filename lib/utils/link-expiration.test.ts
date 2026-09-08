import { getTimeUntilExpiration } from './link-expiration';

const now = Date.parse('2026-09-08T00:00:00Z');

test.each([
  [0, 'expired'], [30_000, 'less than a minute'], [60_000, '1 minute'],
  [120_000, '2 minutes'], [3_600_000, '1 hour'], [86_400_000, '1 day'],
  [604_800_000, '1 week'], [2_592_000_000, '1 month'], [5_184_000_000, '2 months'],
])('formats %i milliseconds remaining as %s', (remaining, expected) => {
  expect(getTimeUntilExpiration(new Date(now + remaining).toISOString(), now)).toBe(expected);
});

test('handles permanent links and the 24-hour boundary', () => {
  expect(getTimeUntilExpiration(null, now)).toBe('never');
  const expiry = new Date(now + 86_430_000);
  expect(getTimeUntilExpiration(expiry, now)).toBe('1 day');
  expect(getTimeUntilExpiration(expiry, now + 61_000)).toBe('23 hours');
});
