import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

const SECRET = process.env.SESSION_SECRET!;

export type SessionPayload = { userId: string; type: "session" };
export type SignupPayload = { email: string; type: "signup" };

export const SESSION_COOKIE = "session";
export const SIGNUP_COOKIE = "signup_token";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
export const SIGNUP_TOKEN_MAX_AGE = 15 * 60;

export function signToken(payload: object, expiresIn: number): string {
  return jwt.sign(payload, SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken<T>(token: string): T | null {
  try {
    return jwt.verify(token, SECRET) as T;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken<SessionPayload>(token);
  if (!payload || payload.type !== "session") return null;
  return payload;
}

export function getSignupTokenFromRequest(req: NextRequest): SignupPayload | null {
  const token = req.cookies.get(SIGNUP_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken<SignupPayload>(token);
  if (!payload || payload.type !== "signup") return null;
  return payload;
}
