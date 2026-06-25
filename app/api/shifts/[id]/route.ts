import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import {
  computeShiftHours,
  computeDailyOvertime,
  computeWeeklyOvertimeForShift,
  getWeekRange,
} from "@/lib/overtime";
import { getPeriodForDate, isLocked } from "@/lib/pay-period";

async function getOwnedShift(req: NextRequest, id: string) {
  const session = getSessionFromRequest(req);
  if (!session) return { error: "Unauthorized" as const, status: 401 as const };

  const shift = await prisma.shiftLog.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!shift) return { error: "Not found" as const, status: 404 as const };
  if (shift.company.userId !== session.userId)
    return { error: "Forbidden" as const, status: 403 as const };

  return { shift, company: shift.company };
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/shifts/[id]">) {
  const { id } = await ctx.params;
  const result = await getOwnedShift(req, id);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });

  const { shift, company } = result;

  const period = getPeriodForDate(shift.workDate, company.anchorPayday);
  if (isLocked(period))
    return NextResponse.json({ error: "This pay period is locked" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request body required" }, { status: 400 });

  const newStart = body.startTime ?? shift.startTime;
  const newEnd = body.endTime ?? shift.endTime;

  if (!/^\d{2}:\d{2}$/.test(newStart) || !/^\d{2}:\d{2}$/.test(newEnd))
    return NextResponse.json({ error: "Times must be HH:MM format" }, { status: 400 });

  const hoursWorked = computeShiftHours(newStart, newEnd, company.breakMinutes);
  let overtimeHours = 0;

  if (company.overtimeRule === "DAILY_OVER_8") {
    overtimeHours = computeDailyOvertime(hoursWorked);
  } else if (company.overtimeRule === "WEEKLY_OVER_40") {
    const { weekStart, weekEnd } = getWeekRange(shift.workDate);
    const weekShifts = await prisma.shiftLog.findMany({
      where: { companyId: company.id, workDate: { gte: weekStart, lte: weekEnd }, NOT: { id: shift.id } },
    });
    const priorHours = weekShifts.reduce((sum, s) => sum + Number(s.hoursWorked), 0);
    overtimeHours = computeWeeklyOvertimeForShift(hoursWorked, priorHours);
  }

  const updated = await prisma.shiftLog.update({
    where: { id: shift.id },
    data: {
      startTime: newStart,
      endTime: newEnd,
      hoursWorked,
      overtimeHours,
      note: body.note !== undefined ? body.note : shift.note,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/shifts/[id]">) {
  const { id } = await ctx.params;
  const result = await getOwnedShift(req, id);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });

  const { shift, company } = result;

  const period = getPeriodForDate(shift.workDate, company.anchorPayday);
  if (isLocked(period))
    return NextResponse.json({ error: "This pay period is locked" }, { status: 403 });

  await prisma.shiftLog.delete({ where: { id: shift.id } });
  return NextResponse.json({ ok: true });
}
