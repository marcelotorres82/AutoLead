import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie, verifySession } from "@/lib/auth";

const protectedPrefixes = [
  "/dashboard",
  "/research",
  "/companies",
  "/personas",
  "/verticals",
  "/history",
  "/backups",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname === "/" ||
    protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(sessionCookie)?.value;
  const session = await verifySession(token);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|\\.well-known|icon\\.svg|favicon\\.ico).*)",
  ],
};
