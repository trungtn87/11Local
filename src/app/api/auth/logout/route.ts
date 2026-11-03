import { NextResponse } from "next/server";
import { userCookie } from "@/lib/user-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(userCookie.name, "", { path: "/", maxAge: 0 });
  return response;
}
