import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import { requireAdmin } from "../../../../../../lib/admin";
import Test from "../../../../../../models/Test";
import { omrQuestionMap } from "../../../../../../lib/omr/attempt-bridge";

export async function GET(_, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { testId } = await params;
  try {
    await connectToDatabase();
    const test = await Test.findOne({ _id: testId, isDeleted: { $ne: true } })
      .select("title subject totalMarks negativeMarks passingPercentage selectionMode shuffleQuestions shuffleOptions maxAttempts")
      .lean();
    if (!test) return NextResponse.json({ success: false, message: "Test not found." }, { status: 404 });
    if (test.selectionMode !== "manual") {
      return NextResponse.json({ success: false, message: "OMR scanning requires a manual fixed question sequence. Random tests cannot be scanned." }, { status: 400 });
    }
    if (test.shuffleQuestions || test.shuffleOptions) {
      return NextResponse.json({ success: false, message: "OMR scanning requires shuffleQuestions=false and shuffleOptions=false." }, { status: 400 });
    }
    const mapping = await omrQuestionMap(testId);
    return NextResponse.json({ success: true, data: { test, questionCount: mapping.length, mapping } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.code || "OMR_TEST_INVALID",
        message: error.message || "Invalid test configuration for OMR.",
        details: error.details || null
      },
      { status: 400 }
    );
  }
}
