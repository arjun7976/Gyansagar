import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Certificate from "../../../../models/Certificate";
import Test from "../../../../models/Test";
import { currentStudent } from "../../../../lib/student-auth";

export async function GET(req) {
  try {
    const student = await currentStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");

    const filter = { studentId: student.id, status: "valid" };
    if (testId) filter.testId = testId;

    const certificates = await Certificate.find(filter)
      .populate("testId", "title subject")
      .sort({ issuedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: certificates });
  } catch (error) {
    console.error("Certificates API error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch certificates" }, { status: 500 });
  }
}
