import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { requireAdmin } from "../../../../../lib/admin";
import { createScoredOMRAttempt } from "../../../../../lib/omr/attempt-bridge";

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { testId, studentId, detections, scanId, set = "A" } = body;

    if (!testId || !studentId || !detections) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: testId, studentId, or detections." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const result = await createScoredOMRAttempt({
      testId,
      studentId,
      detections,
      set,
      scanId: scanId || undefined
    });

    if (result.needsReview) {
      return NextResponse.json(
        { success: false, needsReview: true, issues: result.issues, message: "Some detections require review before confirmation." },
        { status: 422 }
      );
    }

    if (result.duplicate) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          message: "This scan has already been processed and saved.",
          data: {
            attemptId: result.attempt._id,
            score: result.attempt.score,
            percentage: result.attempt.percentage,
            passed: result.attempt.passed
          }
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        message: "OMR result successfully processed and saved to GyanSagar.",
        data: {
          attemptId: result.attempt._id,
          score: result.attempt.score,
          percentage: result.attempt.percentage,
          passed: result.attempt.passed
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Unable to confirm OMR result." },
      { status: 400 }
    );
  }
}
