import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import Test from "../../../../../../models/Test";
import TestAttempt from "../../../../../../models/TestAttempt";
import User from "../../../../../../models/User";
import { getCurrentAdmin } from "../../../../../../lib/auth";

export async function GET(req, { params }) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: testId } = await params;
    await connectToDatabase();

    const test = await Test.findById(testId);
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    }

    const attempts = await TestAttempt.find({
      testId,
      status: { $in: ["submitted", "auto_submitted"] }
    })
      .populate("studentId", "name email")
      .sort({ score: -1, submittedAt: 1 })
      .lean();

    const totalParticipants = attempts.length;
    
    if (totalParticipants === 0) {
      return NextResponse.json({
        success: true,
        test: {
          title: test.title,
          subject: test.subject,
          totalMarks: test.totalMarks,
          passingPercentage: test.passingPercentage
        },
        analytics: {
          totalParticipants: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          averagePercentage: 0,
          passCount: 0,
          failCount: 0,
          averageAccuracy: 0,
          averageTime: 0
        },
        participants: []
      });
    }

    let totalScore = 0;
    let totalPercentage = 0;
    let totalAccuracy = 0;
    let totalTime = 0;
    let passCount = 0;

    attempts.forEach(a => {
      totalScore += a.score;
      totalPercentage += a.percentage;
      totalAccuracy += a.accuracy || 0;
      totalTime += a.timeTakenSeconds || 0;
      if (a.passed) passCount++;
    });

    const highestScore = Math.max(...attempts.map(a => a.score));
    const lowestScore = Math.min(...attempts.map(a => a.score));

    const analytics = {
      totalParticipants,
      averageScore: (totalScore / totalParticipants).toFixed(2),
      highestScore,
      lowestScore,
      averagePercentage: (totalPercentage / totalParticipants).toFixed(2),
      passCount,
      failCount: totalParticipants - passCount,
      averageAccuracy: (totalAccuracy / totalParticipants).toFixed(2),
      averageTime: Math.floor(totalTime / totalParticipants)
    };

    // Add rank to each participant
    const participants = attempts.map((a, idx) => ({
      rank: idx + 1,
      studentName: a.studentId?.name || "Unknown",
      studentEmail: a.studentId?.email || "",
      score: a.score,
      percentage: a.percentage,
      correct: a.correctAnswers,
      wrong: a.wrongAnswers,
      unattempted: a.unattemptedAnswers,
      accuracy: a.accuracy,
      timeTaken: a.timeTakenSeconds,
      result: a.passed ? "PASS" : "FAIL",
      submittedAt: a.submittedAt
    }));

    return NextResponse.json({
      success: true,
      test: {
        title: test.title,
        subject: test.subject,
        totalMarks: test.totalMarks,
        passingPercentage: test.passingPercentage
      },
      analytics,
      participants
    });
  } catch (error) {
    console.error("Test report error:", error);
    return NextResponse.json({ success: false, message: "Failed to generate report" }, { status: 500 });
  }
}
