import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Doubt from "../../../../models/Doubt";
import User from "../../../../models/User";
import { requireAdmin } from "../../../../lib/admin";

export async function GET(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const doubts = await Doubt.find()
      .populate("studentId", "name batch email mobile")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, doubts });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
