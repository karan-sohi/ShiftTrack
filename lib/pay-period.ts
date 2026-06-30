export type PayPeriod = {
  periodStart: Date; // Sunday
  periodEnd: Date;   // Saturday
  payday: Date;      // Friday (periodEnd + 6)
  lockAt: Date;      // Monday (periodEnd + 2)
};

// All calendar-date arithmetic here operates in UTC. anchorPayday/workDate are
// stored as UTC midnight (`@db.Date`), so local-time methods (getDate/setHours)
// would shift dates by a day whenever the server's local timezone is behind UTC.
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Find the biweekly Sun–Sat pay period that contains `date`.
// period_end = anchorPayday − 6 days (a Saturday)
// period_start = period_end − 13 days (a Sunday, two weeks back)
export function getPeriodForDate(date: Date, anchorPayday: Date): PayPeriod {
  const d = startOfDay(date);
  let periodEnd = startOfDay(addDays(anchorPayday, -6));

  // Step forward/backward in 14-day increments until d is inside [periodEnd-13, periodEnd]
  while (d > periodEnd) periodEnd = addDays(periodEnd, 14);
  while (d < addDays(periodEnd, -13)) periodEnd = addDays(periodEnd, -14);

  const periodStart = addDays(periodEnd, -13);
  const payday = addDays(periodEnd, 6);
  const lockAt = addDays(periodEnd, 2);

  return { periodStart, periodEnd, payday, lockAt };
}

export function isLocked(period: PayPeriod, now: Date = new Date()): boolean {
  return now >= period.lockAt;
}

// Count calendar days in [start, end] that fall on one of the given weekday numbers (0=Sun…6=Sat).
export function countWorkdaysInPeriod(
  start: Date,
  end: Date,
  workdays: number[]
): number {
  let count = 0;
  const d = startOfDay(start);
  const e = startOfDay(end);
  while (d <= e) {
    if (workdays.includes(d.getUTCDay())) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}
