import { describe, it, expect } from "vitest";
import { getPeriodForDate, isLocked } from "../pay-period";

// anchorPayday/workDate are UTC-midnight @db.Date values in production, so tests
// build dates with Date.UTC(...) and assert with UTC methods to match that contract
// regardless of the machine's local timezone.

// Known reference: anchorPayday = Fri Jun 26, 2026
// → periodEnd   = Sat Jun 20, 2026  (Jun 26 − 6)
// → periodStart = Sun Jun  7, 2026  (Jun 20 − 13)
// → lockAt      = Mon Jun 22, 2026  (Jun 20 + 2)
// → payday      = Fri Jun 26, 2026  (Jun 20 + 6)

const anchor = new Date(Date.UTC(2026, 5, 26)); // Jun 26, 2026

describe("getPeriodForDate — boundary math", () => {
  it("date mid-period lands in Jun 7–20", () => {
    const p = getPeriodForDate(new Date(Date.UTC(2026, 5, 15)), anchor);
    expect(p.periodStart.getUTCMonth()).toBe(5);
    expect(p.periodStart.getUTCDate()).toBe(7);
    expect(p.periodEnd.getUTCMonth()).toBe(5);
    expect(p.periodEnd.getUTCDate()).toBe(20);
  });

  it("payday is Fri Jun 26", () => {
    const { payday } = getPeriodForDate(new Date(Date.UTC(2026, 5, 15)), anchor);
    expect(payday.getUTCDate()).toBe(26);
    expect(payday.getUTCDay()).toBe(5); // Friday
  });

  it("lockAt is Mon Jun 22", () => {
    const { lockAt } = getPeriodForDate(new Date(Date.UTC(2026, 5, 15)), anchor);
    expect(lockAt.getUTCDate()).toBe(22);
    expect(lockAt.getUTCDay()).toBe(1); // Monday
  });

  it("Jun 7 (first day of period) is included", () => {
    const p = getPeriodForDate(new Date(Date.UTC(2026, 5, 7)), anchor);
    expect(p.periodEnd.getUTCDate()).toBe(20);
  });

  it("Jun 20 (last day of period) is included", () => {
    const p = getPeriodForDate(new Date(Date.UTC(2026, 5, 20)), anchor);
    expect(p.periodEnd.getUTCDate()).toBe(20);
  });

  it("Jun 21 (Sunday) starts the next period", () => {
    const p = getPeriodForDate(new Date(Date.UTC(2026, 5, 21)), anchor);
    expect(p.periodStart.getUTCDate()).toBe(21); // Sun Jun 21
    expect(p.periodEnd.getUTCMonth()).toBe(6);   // July
    expect(p.periodEnd.getUTCDate()).toBe(4);    // Sat Jul 4
  });

  it("overnight shift: Sat start date lands in prior period, not next", () => {
    // If an overnight shift starts Sat and ends Sun, it should be in the period
    // containing Saturday (not Sunday). Test by checking Sat vs Sun produce different periods.
    // Using anchor = Nov 7, 2025 → periodEnd = Nov 1 (Sat), periodStart = Oct 19 (Sun)
    const a = new Date(Date.UTC(2025, 10, 7)); // Nov 7, 2025 anchor
    const satPeriod = getPeriodForDate(new Date(Date.UTC(2025, 10, 1)), a); // Nov 1 = Sat
    const sunPeriod = getPeriodForDate(new Date(Date.UTC(2025, 10, 2)), a); // Nov 2 = Sun, next period
    expect(satPeriod.periodEnd.getUTCDate()).not.toBe(sunPeriod.periodEnd.getUTCDate());
  });
});

describe("isLocked", () => {
  it("locked when now is after lockAt", () => {
    const p = getPeriodForDate(new Date(Date.UTC(2026, 5, 15)), anchor);
    expect(isLocked(p, new Date(Date.UTC(2026, 5, 23)))).toBe(true); // Jun 23 > Jun 22
  });

  it("locked on lockAt itself (>= not >)", () => {
    const p = getPeriodForDate(new Date(Date.UTC(2026, 5, 15)), anchor);
    expect(isLocked(p, new Date(Date.UTC(2026, 5, 22)))).toBe(true); // Jun 22 === Jun 22
  });

  it("not locked the day before lockAt", () => {
    const p = getPeriodForDate(new Date(Date.UTC(2026, 5, 15)), anchor);
    expect(isLocked(p, new Date(Date.UTC(2026, 5, 21)))).toBe(false); // Jun 21 < Jun 22
  });
});
