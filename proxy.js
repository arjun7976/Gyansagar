import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = request.cookies.get("gyansagar_admin_session")?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(adminToken, getSecretKey(), {
        issuer: "gyansagar-test-system",
        audience: "admin",
      });
      if (payload.role !== "admin") throw new Error("Invalid role");
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Protect /student routes
  if (pathname.startsWith("/student")) {
    const studentToken = request.cookies.get("gyansagar_student_session")?.value;
    if (!studentToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(studentToken, getSecretKey(), {
        issuer: "gyansagar-test-system",
        audience: "student",
      });
      if (payload.role !== "student") throw new Error("Invalid role");
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*"],
};
