import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { getCurrentAdmin } from "../../../../lib/auth";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    // Fetch all active students
    const students = await User.find({ role: "student", isActive: true })
      .select("name email")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error("Fetch students error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
