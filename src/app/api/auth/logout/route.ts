import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}
