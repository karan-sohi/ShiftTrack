import { describe, it, expect } from "vitest";
import {
  computeShiftHours,
  computeDailyOvertime,
  computeWeeklyOvertimeForShift,
  getWeekRange,
} from "../overtime";

describe("computeShiftHours", () => {
  it("normal 8h day shift", () => {
    expect(computeShiftHours("09:00", "17:00")).toBe(8);
  });

  it("10h day shift", () => {
    expect(computeShiftHours("09:00", "19:00")).toBe(10);
  });

  it("overnight 10pm–6am = 8h", () => {
    expect(computeShiftHours("22:00", "06:00")).toBe(8);
  });

  it("overnight with fractional hours", () => {
    expect(computeShiftHours("23:30", "07:30")).toBe(8);
  });

  it("shift ending exactly at start = 24h overnight", () => {
    // endMin === startMin triggers overnight add
    expect(computeShiftHours("08:00", "08:00")).toBe(24);
  });
});

describe("computeDailyOvertime", () => {
  it("no OT at exactly 8h", () => {
    expect(computeDailyOvertime(8)).toBe(0);
  });

  it("2h OT on a 10h day", () => {
    expect(computeDailyOvertime(10)).toBe(2);
  });

  it("no OT under 8h", () => {
    expect(computeDailyOvertime(6)).toBe(0);
  });

  it("fractional OT", () => {
    expect(computeDailyOvertime(8.5)).toBeCloseTo(0.5);
  });
});

describe("computeWeeklyOvertimeForShift", () => {
  it("no OT when total stays under 40h", () => {
    expect(computeWeeklyOvertimeForShift(8, 30)).toBe(0);
  });

  it("no OT at exactly 40h total", () => {
    expect(computeWeeklyOvertimeForShift(8, 32)).toBe(0);
  });

  it("all hours OT when prior >= 40h", () => {
    expect(computeWeeklyOvertimeForShift(2, 40)).toBe(2);
  });

  it("split when shift crosses 40h threshold", () => {
    // prior=39h, shift=3h → 1h regular, 2h OT
    expect(computeWeeklyOvertimeForShift(3, 39)).toBe(2);
  });

  it("42h week: extra shift of 2h is fully OT", () => {
    // 5 × 8h shifts = 40h already logged; 2h more = all OT
    expect(computeWeeklyOvertimeForShift(2, 40)).toBe(2);
  });
});

describe("getWeekRange — overnight shift attribution", () => {
  it("returns weekStart on Sunday and weekEnd on Saturday", () => {
    // Nov 1, 2025 is a Saturday
    const sat = new Date(2025, 10, 1); // month 10 = November
    const { weekStart, weekEnd } = getWeekRange(sat);
    expect(weekStart.getDay()).toBe(0); // Sunday
    expect(weekEnd.getDay()).toBe(6);   // Saturday
  });

  it("overnight shift starting Sat Nov 1 ends in same week (not next)", () => {
    const sat = new Date(2025, 10, 1);
    const { weekEnd } = getWeekRange(sat);
    // weekEnd should be Nov 1 (same Saturday), not Nov 8
    expect(weekEnd.getDate()).toBe(1);
    expect(weekEnd.getMonth()).toBe(10); // November
  });

  it("Sun in same week as following Sat", () => {
    const sun = new Date(2025, 9, 26); // Oct 26, 2025 (Sunday)
    const sat = new Date(2025, 10, 1); // Nov 1, 2025 (Saturday)
    const weekOfSun = getWeekRange(sun);
    const weekOfSat = getWeekRange(sat);
    expect(weekOfSun.weekStart.getTime()).toBe(weekOfSat.weekStart.getTime());
  });
});
