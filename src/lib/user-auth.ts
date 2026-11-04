import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "11local_user";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

function secret() {
  const value = process.env.USER_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("USER_SESSION_SECRET must contain at least 32 characters");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createUserSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyUserSession(token?: string): SessionUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, supplied] = parts;
  if (!payload || !supplied) return null;

  const expected = signature(payload);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      !decoded ||
      typeof decoded.id !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.name !== "string" ||
      !Number.isInteger(decoded.exp) ||
      decoded.exp <= Math.floor(Date.now() / 1000)
    ) return null;

    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      avatarUrl: typeof decoded.avatarUrl === "string" ? decoded.avatarUrl : null,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  return verifyUserSession((await cookies()).get(COOKIE_NAME)?.value);
}

export { safeReturnTo } from "./google-auth";

export const userCookie = { name: COOKIE_NAME, maxAge: MAX_AGE_SECONDS };
