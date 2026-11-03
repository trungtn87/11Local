import { NextResponse } from "next/server";
import { adminCookie, createAdminSession, isAdmin, verifyAdminPassword } from "@/lib/admin-auth";

export async function GET() { return NextResponse.json({ authenticated: await isAdmin() }); }
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!verifyAdminPassword(typeof body.password === "string" ? body.password : ""))
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookie.name, createAdminSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: adminCookie.maxAge });
  return response;
}
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminCookie.name, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
