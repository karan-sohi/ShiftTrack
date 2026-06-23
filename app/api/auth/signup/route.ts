import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerifiedAt && existing.username) {
    return NextResponse.json({ error: "Email already registered. Please log in." }, { status: 409 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.upsert({
    where: { email },
    create: { email, verificationCode: code, verificationCodeExpiresAt: expiresAt },
    update: {
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
      emailVerifiedAt: null,
    },
  });

  await sendVerificationEmail(email, code);

  return NextResponse.json({ ok: true });
}
