import { NextResponse, type NextRequest } from "next/server";
import { verifySession, sessionCookie } from "@/lib/auth";
const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/telegram/webhook",
];
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    publicPaths.some((item) => path.startsWith(item)) ||
    path.startsWith("/_next") ||
    path.startsWith("/.well-known/workflow/") ||
    path === "/favicon.ico" ||
    path.startsWith("/api/cron")
  )
    return NextResponse.next();
  const session = await verifySession(
    request.cookies.get(sessionCookie)?.value,
  );
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.well-known/workflow/).*)",
  ],
};
