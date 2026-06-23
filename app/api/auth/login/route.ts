import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = body?.username?.trim().toLowerCase();
  const pin = body?.pin?.trim();

  if (!username || !pin) {
    return NextResponse.json({ error: "Username and PIN required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.pinHash) {
    return NextResponse.json({ error: "Invalid username or PIN" }, { status: 401 });
  }

  if (user.lockedUntil && new Date() < user.lockedUntil) {
    return NextResponse.json(
      { error: "Account locked. Re-verify your email to unlock.", locked: true },
      { status: 423 }
    );
  }

  const match = await bcrypt.compare(pin, user.pinHash);

  if (!match) {
    const attempts = user.failedPinAttempts + 1;
    const shouldLock = attempts >= MAX_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedPinAttempts: attempts,
        lockedUntil: shouldLock ? new Date("2099-01-01") : undefined,
      },
    });

    if (shouldLock) {
      return NextResponse.json(
        { error: "Account locked after 5 failed attempts. Re-verify your email to unlock.", locked: true },
        { status: 423 }
      );
    }

    return NextResponse.json(
      { error: `Invalid PIN. ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} remaining.` },
      { status: 401 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedPinAttempts: 0, lockedUntil: null },
  });

  const token = signToken({ userId: user.id, type: "session" }, SESSION_MAX_AGE);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
