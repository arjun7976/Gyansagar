import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { currentStudent } from "../../../../lib/student-auth";
import TestAttempt from "../../../../models/TestAttempt";
import Test from "../../../../models/Test"; // Ensure Test model is registered

export async function GET() {
  const student = await currentStudent();
  if (!student) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    // Strict server-side ownership: only fetch attempts belonging to current authenticated student
    const attempts = await TestAttempt.find({
      studentId: student.id,
      source: "omr",
      status: { $in: ["submitted", "auto_submitted"] }
    })
      .populate("testId", "title subject totalMarks passingPercentage")
      .sort({ submittedAt: -1 })
      .lean();

    const results = attempts.map((a) => ({
      _id: a._id,
      testTitle: a.testId?.title || "Offline OMR Test",
      subject: a.testId?.subject || "General",
      totalQuestions: a.totalQuestions,
      correctAnswers: a.correctAnswers,
      wrongAnswers: a.wrongAnswers,
      unattemptedAnswers: a.unattemptedAnswers,
      totalMarks: a.testId?.totalMarks || a.totalQuestions,
      score: a.score,
      percentage: a.percentage,
      accuracy: a.accuracy,
      passed: a.passed,
      submittedAt: a.submittedAt || a.updatedAt,
      source: a.source
    }));

    return NextResponse.json({
      success: true,
      studentName: student.name,
      results
    });
  } catch (error) {
    console.error("Student OMR Results API Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load offline OMR results." },
      { status: 500 }
    );
  }
}
