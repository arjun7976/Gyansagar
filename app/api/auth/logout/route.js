import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/auth";
export function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set(clearSessionCookie);
  response.cookies.set({
    name: "gyansagar_student_session",
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0
    }
  });
  return response;
}