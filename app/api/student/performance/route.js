import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import TestAttempt from "../../../../models/TestAttempt";
import mongoose from "mongoose";
import { currentStudent } from "../../../../lib/student-auth";

export async function GET() {
  try {
    const student = await currentStudent();
    if (!student) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const attempts = await TestAttempt.find({ 
        studentId: student.id,
        status: { $in: ["submitted", "auto_submitted"] }
      })
      .populate("testId", "title subject totalMarks passingPercentage")
      .sort({ submittedAt: 1 }) // Chronological for trend
      .lean();

    const totalAttempts = attempts.length;
    let totalScore = 0;
    let totalPercentage = 0;
    let passedCount = 0;

    const trend = [];
    const subjects = {};

    attempts.forEach(a => {
      totalScore += a.score;
      totalPercentage += a.percentage;
      if (a.passed) passedCount++;

      trend.push({
        testName: a.testId?.title || "Unknown Test",
        percentage: a.percentage,
        date: a.submittedAt
      });

      const subject = a.testId?.subject || "Uncategorized";
      if (!subjects[subject]) {
        subjects[subject] = { attempted: 0, totalScore: 0, totalPercentage: 0, totalAccuracy: 0 };
      }
      subjects[subject].attempted += 1;
      subjects[subject].totalScore += a.score;
      subjects[subject].totalPercentage += a.percentage;
      subjects[subject].totalAccuracy += a.accuracy || 0;
    });

    const subjectStats = Object.keys(subjects).map(sub => {
      const s = subjects[sub];
      return {
        subject: sub,
        attempted: s.attempted,
        averageScore: (s.totalScore / s.attempted).toFixed(2),
        averagePercentage: (s.totalPercentage / s.attempted).toFixed(2),
        averageAccuracy: (s.totalAccuracy / s.attempted).toFixed(2)
      };
    });

    // Calculate additional statistics
    let totalAccuracy = 0;
    let bestScore = 0;
    let bestRank = Infinity;
    let totalWrong = 0;
    let totalUnattempted = 0;

    attempts.forEach(a => {
      totalAccuracy += a.accuracy || 0;
      if (a.score > bestScore) bestScore = a.score;
      totalWrong += a.wrongAnswers || 0;
      totalUnattempted += a.unattemptedAnswers || 0;
    });

    const overall = {
      testsAttempted: totalAttempts,
      testsPassed: passedCount,
      testsFailed: totalAttempts - passedCount,
      averageScore: totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(2) : 0,
      averagePercentage: totalAttempts > 0 ? (totalPercentage / totalAttempts).toFixed(2) : 0,
      averageAccuracy: totalAttempts > 0 ? (totalAccuracy / totalAttempts).toFixed(2) : 0,
      bestScore: bestScore,
      bestRank: bestRank === Infinity ? null : bestRank
    };

    // For recent tests, we reverse the trend array to show latest first
    const recentHistory = [...trend].reverse().slice(0, 5);

    return NextResponse.json({ 
      success: true, 
      overall, 
      trend, 
      subjectStats,
      recentHistory
    });

  } catch (error) {
    console.error("Performance API Error:", error);
    return NextResponse.json({ success: false, message: "Error calculating performance" }, { status: 500 });
  }
}
