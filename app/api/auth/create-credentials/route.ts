import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  getSignupTokenFromRequest,
  signToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SIGNUP_COOKIE,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const signup = getSignupTokenFromRequest(req);
  if (!signup) {
    return NextResponse.json({ error: "Session expired. Please verify your email again." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const username = body?.username?.trim().toLowerCase();
  const pin = body?.pin?.trim();

  if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–20 chars (letters, numbers, underscores)" },
      { status: 400 }
    );
  }

  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: signup.email } });
  if (!user || !user.emailVerifiedAt) {
    return NextResponse.json({ error: "Email not verified" }, { status: 401 });
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername && existingUsername.id !== user.id) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const pinHash = await bcrypt.hash(pin, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { username, pinHash },
  });

  const sessionToken = signToken({ userId: user.id, type: "session" }, SESSION_MAX_AGE);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  res.cookies.delete(SIGNUP_COOKIE);
  return res;
}
