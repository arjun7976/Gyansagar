import { NextResponse } from "next/server";

export async function GET() {
  try { const { connectToDatabase } = await import("../../../lib/mongodb"); await connectToDatabase(); return NextResponse.json({ success: true, message: "Database connection is healthy" }); }
  catch (error) { console.error("Database health check failed:", error.message); return NextResponse.json({ success: false, message: "Database connection is unavailable" }, { status: 503 }); }
}
