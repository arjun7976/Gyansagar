import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import NotificationLog from "../../../../models/NotificationLog";
import User from "../../../../models/User";
import { getCurrentAdmin } from "../../../../lib/auth";

export async function GET(req) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const type = searchParams.get("type") || "";
    const channel = searchParams.get("channel") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    await connectToDatabase();

    const query = {};
    if (type) query.type = type;
    if (channel) query.channel = channel;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await NotificationLog.countDocuments(query);
    const logs = await NotificationLog.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Notification logs error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch notification logs" }, { status: 500 });
  }
}
