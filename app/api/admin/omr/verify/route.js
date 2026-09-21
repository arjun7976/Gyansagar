import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, message: "OMR scanner verification endpoint active." });
}
