import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import TestAttempt from "../../../../models/TestAttempt";
import User from "../../../../models/User";
import { getCurrentAdmin } from "../../../../lib/auth";

export async function GET(req) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const testId = searchParams.get("testId") || "";
    const status = searchParams.get("status") || "";
    const passFail = searchParams.get("passFail") || "";
    const sort = searchParams.get("sort") || "latest";

    await connectToDatabase();

    const query = {
      status: { $in: ["submitted", "auto_submitted"] }
    };

    if (testId) {
      query.testId = testId;
    }

    if (passFail === "passed") {
      query.passed = true;
    } else if (passFail === "failed") {
      query.passed = false;
    }

    if (search) {
      // Find users matching search name
      const users = await User.find({ name: { $regex: search, $options: "i" }, role: "student" }).select("_id").lean();
      const userIds = users.map(u => u._id);
      query.studentId = { $in: userIds };
    }

    let sortOptions = { submittedAt: -1 };
    if (sort === "oldest") sortOptions = { submittedAt: 1 };
    if (sort === "highestScore") sortOptions = { score: -1, submittedAt: -1 };
    if (sort === "lowestScore") sortOptions = { score: 1, submittedAt: -1 };

    const total = await TestAttempt.countDocuments(query);
    const results = await TestAttempt.find(query)
      .populate("studentId", "name email mobile")
      .populate("testId", "title subject totalMarks passingPercentage")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ 
      success: true, 
      results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Admin Results API Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
