import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import TestAttempt from "../../../../../models/TestAttempt";
import User from "../../../../../models/User";
import Test from "../../../../../models/Test";
import * as XLSX from "xlsx";
import { getCurrentAdmin } from "../../../../../lib/auth";

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

    // Format data for Excel
    const excelData = results.map((r, idx) => ({
      "Rank": r.rank,
      "Student Name": r.studentId?.name || "Unknown",
      "Test": r.testId?.title || "Unknown Test",
      "Subject": r.testId?.subject || "",
      "Score": r.score,
      "Total Marks": r.testId?.totalMarks || 0,
      "Percentage": r.percentage + "%",
      "Correct": r.correctAnswers,
      "Wrong": r.wrongAnswers,
      "Unattempted": r.unattemptedAnswers,
      "Accuracy": r.accuracy + "%",
      "Time Taken (seconds)": r.timeTakenSeconds,
      "Result": r.passed ? "PASS" : "FAIL",
      "Submitted At": new Date(r.submittedAt).toLocaleString()
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 30 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 10 },
      { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Results");

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="results-export.xlsx"',
        'Content-Length': excelBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json({ success: false, message: "Failed to export results" }, { status: 500 });
  }
}
