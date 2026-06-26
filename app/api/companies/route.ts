import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companies = await prisma.company.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const err = validateCompanyBody(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const company = await prisma.company.create({
      data: {
        userId: session.userId,
        name: body.name.trim(),
        startTime: body.startTime,
        endTime: body.endTime,
        workdays: body.workdays,
        hourlyRate: body.hourlyRate,
        overtimeRule: body.overtimeRule,
        overtimeMultiplier: body.overtimeMultiplier ?? 1.5,
        anchorPayday: new Date(body.anchorPayday),
        timezone: typeof body.timezone === "string" ? body.timezone : "America/Chicago",
        breakMinutes: typeof body.breakMinutes === "number" && body.breakMinutes >= 0 ? body.breakMinutes : 0,
        shiftPremiumRate: typeof body.shiftPremiumRate === "number" && body.shiftPremiumRate >= 0 ? body.shiftPremiumRate : 0,
      },
    });
    return NextResponse.json(company, { status: 201 });
  } catch (err) {
    console.error("POST /api/companies error:", err);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}

function validateCompanyBody(body: Record<string, unknown> | null): string | null {
  if (!body) return "Request body required";
  if (!body.name || typeof body.name !== "string" || !body.name.trim())
    return "Company name required";
  if (!isValidTime(body.startTime)) return "Valid start time required (HH:MM)";
  if (!isValidTime(body.endTime)) return "Valid end time required (HH:MM)";
  if (
    !Array.isArray(body.workdays) ||
    body.workdays.length === 0 ||
    !body.workdays.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
  )
    return "At least one workday required (0=Sun … 6=Sat)";
  if (typeof body.hourlyRate !== "number" || body.hourlyRate <= 0)
    return "Hourly rate must be greater than 0";
  if (!["NONE", "DAILY_OVER_8", "WEEKLY_OVER_40"].includes(body.overtimeRule as string))
    return "Invalid overtime rule";
  if (
    body.overtimeMultiplier !== undefined &&
    (typeof body.overtimeMultiplier !== "number" || body.overtimeMultiplier < 1)
  )
    return "Overtime multiplier must be at least 1";
  if (!body.anchorPayday || isNaN(Date.parse(body.anchorPayday as string)))
    return "Valid anchor payday date required";
  return null;
}

function isValidTime(val: unknown): boolean {
  return typeof val === "string" && /^\d{2}:\d{2}$/.test(val);
}
