import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import {
  computeShiftHours,
  computeDailyOvertime,
  computeWeeklyOvertimeForShift,
  getWeekRange,
} from "@/lib/overtime";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || company.userId !== session.userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const shifts = await prisma.shiftLog.findMany({
    where: { companyId, ...(Object.keys(dateFilter).length ? { workDate: dateFilter } : {}) },
    orderBy: { workDate: "desc" },
  });

  return NextResponse.json(shifts);
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request body required" }, { status: 400 });

  const { companyId, workDate, startTime, endTime, note, isScheduled, applyPremium } = body;

  if (!companyId || !workDate || !startTime || !endTime)
    return NextResponse.json({ error: "companyId, workDate, startTime, endTime are required" }, { status: 400 });

  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime))
    return NextResponse.json({ error: "Times must be HH:MM format" }, { status: 400 });

  if (isNaN(Date.parse(workDate)))
    return NextResponse.json({ error: "Invalid work date" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || company.userId !== session.userId)
    return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const hoursWorked = computeShiftHours(startTime, endTime, company.breakMinutes);
  const premiumPay = applyPremium ? Number(company.shiftPremiumRate) * hoursWorked : 0;
  let overtimeHours = 0;

  if (company.overtimeRule === "DAILY_OVER_8") {
    overtimeHours = computeDailyOvertime(hoursWorked);
  } else if (company.overtimeRule === "WEEKLY_OVER_40") {
    const { weekStart, weekEnd } = getWeekRange(new Date(workDate));
    const weekShifts = await prisma.shiftLog.findMany({
      where: { companyId, workDate: { gte: weekStart, lte: weekEnd } },
    });
    const priorHours = weekShifts.reduce((sum, s) => sum + Number(s.hoursWorked), 0);
    overtimeHours = computeWeeklyOvertimeForShift(hoursWorked, priorHours);
  }

  const shift = await prisma.shiftLog.create({
    data: {
      companyId,
      workDate: new Date(workDate),
      startTime,
      endTime,
      hoursWorked,
      overtimeHours,
      premiumPay,
      note: note ?? null,
      isScheduled: isScheduled ?? false,
    },
  });

  return NextResponse.json(shift, { status: 201 });
}
