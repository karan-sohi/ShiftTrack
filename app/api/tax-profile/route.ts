import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.taxProfile.findUnique({ where: { userId: session.userId } });
  return NextResponse.json(profile ?? null);
}

export async function PATCH(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.country) return NextResponse.json({ error: "country required" }, { status: 400 });

  const profile = await prisma.taxProfile.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, country: body.country, region: body.region ?? "" },
    update: { country: body.country, region: body.region ?? "" },
  });
  return NextResponse.json(profile);
}

export async function DELETE(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.taxProfile.deleteMany({ where: { userId: session.userId } });
  return NextResponse.json({ ok: true });
}
