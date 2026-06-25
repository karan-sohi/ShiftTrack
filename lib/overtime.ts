function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function computeShiftHours(
  startTime: string,
  endTime: string,
  breakMinutes = 0
): number {
  const startMin = timeToMinutes(startTime);
  let endMin = timeToMinutes(endTime);
  if (endMin <= startMin) endMin += 24 * 60; // overnight
  return Math.max(0, (endMin - startMin - breakMinutes) / 60);
}

export function computeDailyOvertime(hoursWorked: number): number {
  return Math.max(0, hoursWorked - 8);
}

// Returns overtime hours contributed by this shift given prior hours in the week.
export function computeWeeklyOvertimeForShift(
  shiftHours: number,
  priorWeekHours: number
): number {
  const totalAfter = priorWeekHours + shiftHours;
  if (totalAfter <= 40) return 0;
  if (priorWeekHours >= 40) return shiftHours;
  return totalAfter - 40;
}

// Returns the Sun–Sat week boundary containing `date`.
export function getWeekRange(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - d.getDay()); // back to Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { weekStart, weekEnd };
}
