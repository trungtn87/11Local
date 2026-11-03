import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "11local_admin";
const MAX_AGE_SECONDS = 8 * 60 * 60;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function verifyAdminPassword(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAdminSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyAdminSession(token?: string) {
  if (!token) return false;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return false;
  const expected = signature(payload);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isInteger(value.exp) && value.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export async function isAdmin() {
  return verifyAdminSession((await cookies()).get(COOKIE_NAME)?.value);
}

export const adminCookie = { name: COOKIE_NAME, maxAge: MAX_AGE_SECONDS };
