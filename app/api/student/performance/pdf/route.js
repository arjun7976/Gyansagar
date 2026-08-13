import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import TestAttempt from "../../../../../models/TestAttempt";
import User from "../../../../../models/User";
import { currentStudent } from "../../../../../lib/student-auth";
import { createPDF, addHeader, addFooter, addSection, checkPageBreak, formatDate } from "../../../../../lib/pdf/helpers";

export async function GET(req) {
  try {
    const student = await currentStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const attempts = await TestAttempt.find({ 
      studentId: student.id,
      status: { $in: ["submitted", "auto_submitted"] }
    })
      .populate("testId", "title subject totalMarks passingPercentage")
      .sort({ submittedAt: -1 })
      .lean();

    const studentData = await User.findById(student.id).lean();

    const doc = createPDF();
    let y = 50;
    let pageNumber = 1;

    // Header
    addHeader(doc, "PERFORMANCE REPORT");

    // Student Information
    y = addSection(doc, "Student Information", y);
    doc.setFontSize(11);
    doc.text(`Name: ${studentData.name}`, 15, y);
    y += 6;
    doc.text(`Report Generated: ${formatDate(new Date())}`, 15, y);
    y += 10;

    // Overall Statistics
    y = checkPageBreak(doc, y, 50);
    y = addSection(doc, "Overall Statistics", y);

    let totalScore = 0;
    let totalPercentage = 0;
    let totalAccuracy = 0;
    let passedCount = 0;
    let bestScore = 0;

    attempts.forEach(a => {
      totalScore += a.score;
      totalPercentage += a.percentage;
      totalAccuracy += a.accuracy || 0;
      if (a.passed) passedCount++;
      if (a.score > bestScore) bestScore = a.score;
    });

    const totalAttempts = attempts.length;

    const stats = [
      ["Tests Attempted", totalAttempts.toString()],
      ["Tests Passed", passedCount.toString()],
      ["Tests Failed", (totalAttempts - passedCount).toString()],
      ["Average Score", totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(2) : "0"],
      ["Average Percentage", totalAttempts > 0 ? (totalPercentage / totalAttempts).toFixed(2) + "%" : "0%"],
      ["Average Accuracy", totalAttempts > 0 ? (totalAccuracy / totalAttempts).toFixed(2) + "%" : "0%"],
      ["Best Score", bestScore.toString()]
    ];

    stats.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${label}:`, 15, y);
      doc.setFont("helvetica", "bold");
      doc.text(value, 60, y);
      y += 7;
    });
    y += 5;

    // Subject-wise Performance
    y = checkPageBreak(doc, y, 40);
    y = addSection(doc, "Subject-wise Performance", y);

    const subjects = {};
    attempts.forEach(a => {
      const subject = a.testId?.subject || "Uncategorized";
      if (!subjects[subject]) {
        subjects[subject] = { attempted: 0, totalPercentage: 0, totalAccuracy: 0 };
      }
      subjects[subject].attempted += 1;
      subjects[subject].totalPercentage += a.percentage;
      subjects[subject].totalAccuracy += a.accuracy || 0;
    });

    Object.keys(subjects).forEach(subject => {
      y = checkPageBreak(doc, y, 15);
      const s = subjects[subject];
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(subject, 15, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`Attempts: ${s.attempted} | Avg %: ${(s.totalPercentage / s.attempted).toFixed(2)}% | Avg Accuracy: ${(s.totalAccuracy / s.attempted).toFixed(2)}%`, 15, y);
      y += 8;
    });
    y += 5;

    // Recent Test Performance
    y = checkPageBreak(doc, y, 30);
    y = addSection(doc, "Recent Test Performance", y);

    const recentTests = attempts.slice(0, 10);
    y = addTableRow(doc, ["Test", "Score", "%", "Result"], y, true);
    y += 2;

    recentTests.forEach(a => {
      y = checkPageBreak(doc, y, 10);
      const resultText = a.passed ? "PASS" : "FAIL";
      y = addTableRow(doc, [
        a.testId?.title?.substring(0, 30) || "Unknown",
        a.score.toString(),
        a.percentage + "%",
        resultText
      ], y);
    });

    // Footer
    addFooter(doc, pageNumber);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="performance-report.pdf"',
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error("Performance PDF generation error:", error);
    return NextResponse.json({ success: false, message: "Failed to generate PDF" }, { status: 500 });
  }
}
