import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Certificate from "../../../../models/Certificate";
import User from "../../../../models/User";
import Test from "../../../../models/Test";
import { requireAdmin } from "../../../../lib/admin";

export async function GET(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    await connectToDatabase();
    
    const query = { status: "valid" };

    const certificates = await Certificate.find(query)
      .populate("studentId", "name email batch")
      .populate("testId", "title subject")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Certificate.countDocuments(query);

    return NextResponse.json({
      success: true,
      certificates,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Certificates fetch error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
