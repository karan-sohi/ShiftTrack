import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  signToken,
  SIGNUP_COOKIE,
  SIGNUP_TOKEN_MAX_AGE,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const code = body?.code?.trim();

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.verificationCode || !user.verificationCodeExpiresAt) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  if (new Date() > user.verificationCodeExpiresAt) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
  }

  if (user.verificationCode !== code) {
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { email },
    data: {
      emailVerifiedAt: new Date(),
      verificationCode: null,
      verificationCodeExpiresAt: null,
      failedPinAttempts: 0,
      lockedUntil: null,
    },
  });

  const token = signToken({ email, type: "signup" }, SIGNUP_TOKEN_MAX_AGE);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SIGNUP_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SIGNUP_TOKEN_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
