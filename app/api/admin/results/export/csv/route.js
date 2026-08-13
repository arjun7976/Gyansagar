import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import TestAttempt from "../../../../../../models/TestAttempt";
import User from "../../../../../../models/User";
import Test from "../../../../../../models/Test";
import { getCurrentAdmin } from "../../../../../../lib/auth";

export async function GET(req) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId") || "";
    const studentId = searchParams.get("studentId") || "";
    const status = searchParams.get("status") || "";
    const passFail = searchParams.get("passFail") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    await connectToDatabase();

    const query = {
      status: { $in: ["submitted", "auto_submitted"] }
    };

    if (testId) query.testId = testId;
    if (studentId) query.studentId = studentId;
    if (passFail === "passed") query.passed = true;
    if (passFail === "failed") query.passed = false;

    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) query.submittedAt.$lte = new Date(endDate);
    }

    const results = await TestAttempt.find(query)
      .populate("studentId", "name email")
      .populate("testId", "title subject totalMarks passingPercentage")
      .sort({ submittedAt: -1 })
      .lean();

    // Calculate rank for each result
    for (const result of results) {
      const higherScores = await TestAttempt.countDocuments({
        testId: result.testId._id,
        status: { $in: ["submitted", "auto_submitted"] },
        score: { $gt: result.score }
      });
      result.rank = higherScores + 1;
    }

    // CSV header
    const headers = ["Rank", "Student Name", "Test", "Subject", "Score", "Total Marks", "Percentage", "Correct", "Wrong", "Unattempted", "Accuracy", "Time Taken (seconds)", "Result", "Submitted At"];

    // Format data for CSV with proper escaping
    const csvRows = [headers.join(",")];

    results.forEach(r => {
      const row = [
        r.rank,
        escapeCSV(r.studentId?.name || "Unknown"),
        escapeCSV(r.testId?.title || "Unknown Test"),
        escapeCSV(r.testId?.subject || ""),
        r.score,
        r.testId?.totalMarks || 0,
        r.percentage + "%",
        r.correctAnswers,
        r.wrongAnswers,
        r.unattemptedAnswers,
        r.accuracy + "%",
        r.timeTakenSeconds,
        r.passed ? "PASS" : "FAIL",
        escapeCSV(new Date(r.submittedAt).toLocaleString())
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="results-export.csv"',
        'Content-Length': Buffer.byteLength(csvContent).toString()
      }
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json({ success: false, message: "Failed to export results" }, { status: 500 });
  }
}

function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
