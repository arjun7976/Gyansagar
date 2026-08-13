import { NextResponse } from "next/server";
import { processPendingNotifications } from "../../../../lib/notifications/queue";

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const results = await processPendingNotifications(limit);

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error) {
    console.error("Process notifications error:", error);
    return NextResponse.json({ success: false, message: "Failed to process notifications" }, { status: 500 });
  }
}
