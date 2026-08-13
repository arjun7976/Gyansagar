import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import NotificationLog from "../../../../../../models/NotificationLog";
import { getCurrentAdmin } from "../../../../../../lib/auth";
import { processNotification } from "../../../../../../lib/notifications/queue";

export async function POST(req, { params }) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const log = await NotificationLog.findById(id);
    if (!log) {
      return NextResponse.json({ success: false, message: "Notification not found" }, { status: 404 });
    }

    // Reset status to pending for retry
    log.status = "pending";
    log.errorMessage = null;
    await log.save();

    // Process the notification
    const result = await processNotification(log);

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Notification sent successfully" : result.message
    });
  } catch (error) {
    console.error("Retry notification error:", error);
    return NextResponse.json({ success: false, message: "Failed to retry notification" }, { status: 500 });
  }
}
