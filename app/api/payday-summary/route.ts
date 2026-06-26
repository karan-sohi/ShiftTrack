import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { getPeriodForDate, isLocked } from "@/lib/pay-period";
import { computeWeeklyOvertimeForShift, getWeekRange } from "@/lib/overtime";

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const periodEndStr = searchParams.get("periodEnd");

  if (!companyId || !periodEndStr)
    return NextResponse.json({ error: "companyId and periodEnd required" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || company.userId !== session.userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Parse periodEnd as local midnight
  const [y, mo, day] = periodEndStr.split("-").map(Number);
  const periodEndDate = new Date(y, mo - 1, day);
  const period = getPeriodForDate(periodEndDate, company.anchorPayday);

  // Verify the provided periodEnd actually matches the computed period
  if (toISODate(period.periodEnd) !== periodEndStr)
    return NextResponse.json({ error: "Invalid periodEnd for this company" }, { status: 400 });

  const shifts = await prisma.shiftLog.findMany({
    where: {
      companyId: company.id,
      workDate: { gte: period.periodStart, lte: period.periodEnd },
    },
    orderBy: { workDate: "asc" },
  });

  const rate = Number(company.hourlyRate);
  const mult = Number(company.overtimeMultiplier);
  const rule = company.overtimeRule;

  // For WEEKLY_OVER_40 we need to recompute OT from scratch (per-shift weekly context).
  // Use stored overtimeHours for DAILY_OVER_8 and NONE (already correct at save time).
  // For WEEKLY we recompute here to be accurate in summary.
  type DayEntry = {
    date: string;
    dayOfWeek: string;
    hoursWorked: number;
    overtimeHours: number;
    regularPay: number;
    otPay: number;
    premiumPay: number;
    dayPay: number;
    note: string | null;
  };

  const dailyBreakdown: DayEntry[] = [];
  let totalHours = 0;
  let totalOT = 0;

  if (rule === "WEEKLY_OVER_40") {
    // Recompute weekly OT for shifts in this period in chronological order,
    // seeding each week with hours from shifts *outside* this period that fall in the same week.
    const weekHoursCache = new Map<string, number>();

    for (const s of shifts) {
      const { weekStart, weekEnd } = getWeekRange(s.workDate);
      const weekKey = toISODate(weekStart);

      if (!weekHoursCache.has(weekKey)) {
        // Load prior hours for this week from shifts outside the current period
        const priorInWeek = await prisma.shiftLog.aggregate({
          where: {
            companyId: company.id,
            workDate: { gte: weekStart, lte: weekEnd },
            NOT: { workDate: { gte: period.periodStart, lte: period.periodEnd } },
          },
          _sum: { hoursWorked: true },
        });
        weekHoursCache.set(weekKey, Number(priorInWeek._sum.hoursWorked ?? 0));
      }

      const priorHours = weekHoursCache.get(weekKey)!;
      const h = Number(s.hoursWorked);
      const ot = computeWeeklyOvertimeForShift(h, priorHours);
      weekHoursCache.set(weekKey, priorHours + h);

      const reg = h - ot;
      const regPay = reg * rate;
      const otPayAmt = ot * rate * mult;
      const premAmt = Number(s.premiumPay);
      totalHours += h;
      totalOT += ot;

      dailyBreakdown.push({
        date: toISODate(s.workDate),
        dayOfWeek: s.workDate.toLocaleDateString("en-US", { weekday: "long" }),
        hoursWorked: h,
        overtimeHours: ot,
        regularPay: regPay,
        otPay: otPayAmt,
        premiumPay: premAmt,
        dayPay: regPay + otPayAmt + premAmt,
        note: s.note,
      });
    }
  } else {
    // Use stored values (computed at save time)
    for (const s of shifts) {
      const h = Number(s.hoursWorked);
      const ot = Number(s.overtimeHours);
      const reg = h - ot;
      const regPay = reg * rate;
      const otPayAmt = ot * rate * mult;
      const premAmt = Number(s.premiumPay);
      totalHours += h;
      totalOT += ot;

      dailyBreakdown.push({
        date: toISODate(s.workDate),
        dayOfWeek: s.workDate.toLocaleDateString("en-US", { weekday: "long" }),
        hoursWorked: h,
        overtimeHours: ot,
        regularPay: regPay,
        otPay: otPayAmt,
        premiumPay: premAmt,
        dayPay: regPay + otPayAmt + premAmt,
        note: s.note,
      });
    }
  }

  const regularHours = totalHours - totalOT;
  const totalPremium = dailyBreakdown.reduce((sum, d) => sum + d.premiumPay, 0);
  const regularPay = regularHours * rate;
  const otPay = totalOT * rate * mult;
  const grossPay = regularPay + otPay + totalPremium;

  return NextResponse.json({
    periodStart: toISODate(period.periodStart),
    periodEnd: toISODate(period.periodEnd),
    payday: toISODate(period.payday),
    lockAt: toISODate(period.lockAt),
    locked: isLocked(period),
    totalHours,
    regularHours,
    overtimeHours: totalOT,
    regularPay,
    otPay,
    premiumPay: totalPremium,
    grossPay,
    dailyBreakdown,
  });
}
