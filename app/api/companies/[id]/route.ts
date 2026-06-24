import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

async function getOwnedCompany(req: NextRequest, id: string) {
  const session = getSessionFromRequest(req);
  if (!session) return { error: "Unauthorized", status: 401, company: null, session: null };

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return { error: "Not found", status: 404, company: null, session };
  if (company.userId !== session.userId)
    return { error: "Forbidden", status: 403, company: null, session };

  return { error: null, status: 200, company, session };
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/companies/[id]">) {
  const { id } = await ctx.params;
  const { error, status, company } = await getOwnedCompany(req, id);
  if (error) return NextResponse.json({ error }, { status });
  return NextResponse.json(company);
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/companies/[id]">) {
  const { id } = await ctx.params;
  const { error, status, company } = await getOwnedCompany(req, id);
  if (error) return NextResponse.json({ error }, { status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request body required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.startTime !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(body.startTime))
      return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    data.startTime = body.startTime;
  }
  if (body.endTime !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(body.endTime))
      return NextResponse.json({ error: "Invalid end time" }, { status: 400 });
    data.endTime = body.endTime;
  }
  if (body.workdays !== undefined) {
    if (
      !Array.isArray(body.workdays) ||
      body.workdays.length === 0 ||
      !body.workdays.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
    )
      return NextResponse.json({ error: "At least one valid workday required" }, { status: 400 });
    data.workdays = body.workdays;
  }
  if (body.hourlyRate !== undefined) {
    if (typeof body.hourlyRate !== "number" || body.hourlyRate <= 0)
      return NextResponse.json({ error: "Hourly rate must be > 0" }, { status: 400 });
    data.hourlyRate = body.hourlyRate;
  }
  if (body.overtimeRule !== undefined) {
    if (!["NONE", "DAILY_OVER_8", "WEEKLY_OVER_40"].includes(body.overtimeRule))
      return NextResponse.json({ error: "Invalid overtime rule" }, { status: 400 });
    data.overtimeRule = body.overtimeRule;
  }
  if (body.overtimeMultiplier !== undefined) {
    if (typeof body.overtimeMultiplier !== "number" || body.overtimeMultiplier < 1)
      return NextResponse.json({ error: "Multiplier must be ≥ 1" }, { status: 400 });
    data.overtimeMultiplier = body.overtimeMultiplier;
  }
  if (body.anchorPayday !== undefined) {
    if (isNaN(Date.parse(body.anchorPayday)))
      return NextResponse.json({ error: "Invalid anchor payday" }, { status: 400 });
    data.anchorPayday = new Date(body.anchorPayday);
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  const updated = await prisma.company.update({ where: { id: company!.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/companies/[id]">) {
  const { id } = await ctx.params;
  const { error, status, company } = await getOwnedCompany(req, id);
  if (error) return NextResponse.json({ error }, { status });

  await prisma.company.delete({ where: { id: company!.id } });
  return NextResponse.json({ ok: true });
}
