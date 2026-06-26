import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

async function getCompanyForSession(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return null;
  return prisma.company.findFirst({
    where: { userId: session.userId, isActive: true },
    orderBy: { createdAt: "desc" },
  }) ?? prisma.company.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } });
}

export async function GET(req: NextRequest) {
  const company = await getCompanyForSession(req);
  if (!company) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.reminderSettings.findUnique({
    where: { companyId: company.id },
  });

  // Return defaults if no row yet
  return NextResponse.json(
    settings ?? { enabled: false, delayHours: 3, notifyEmail: null }
  );
}

export async function PATCH(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findFirst({
    where: { userId: session.userId, isActive: true },
    orderBy: { createdAt: "desc" },
  }) ?? await prisma.company.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } });
  if (!company) return NextResponse.json({ error: "No company found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request body required" }, { status: 400 });

  const { enabled, delayHours, notifyEmail } = body;

  if (typeof enabled !== "boolean")
    return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });

  const hours = Number(delayHours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 24)
    return NextResponse.json({ error: "delayHours must be 1–24" }, { status: 400 });

  if (notifyEmail !== null && notifyEmail !== undefined) {
    if (typeof notifyEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail))
      return NextResponse.json({ error: "Invalid notifyEmail" }, { status: 400 });
  }

  const settings = await prisma.reminderSettings.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      enabled,
      delayHours: hours,
      notifyEmail: notifyEmail ?? null,
    },
    update: {
      enabled,
      delayHours: hours,
      notifyEmail: notifyEmail ?? null,
    },
  });

  return NextResponse.json(settings);
}
