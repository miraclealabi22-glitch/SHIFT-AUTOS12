import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/graphql",
  "/api/media",
  "/api/admin",
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.some((route) => (
    route === pathname || pathname.startsWith(`${route}/`)
  ));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("shift_session")?.value;
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|mp4|m4v|mov|webm|mp3|m4a|wav|ogg|css|js)).*)",
  ],
};
