import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import TestAttempt from "../../../../../../models/TestAttempt";
import Test from "../../../../../../models/Test";
import User from "../../../../../../models/User";
import Question from "../../../../../../models/Question";
import { currentStudent } from "../../../../../../lib/student-auth";
import { generateResultPDF } from "../../../../../../lib/pdf/resultPdf";

export async function GET(req, { params }) {
  try {
    const student = await currentStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    // Fetch attempt with ownership verification
    const attempt = await TestAttempt.findOne({ _id: id, studentId: student.id })
      .populate("testId")
      .lean();

    if (!attempt) {
      return NextResponse.json({ success: false, message: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status === "in_progress") {
      return NextResponse.json({ success: false, message: "Test not submitted yet" }, { status: 400 });
    }

    // Fetch related data
    const test = await Test.findById(attempt.testId._id || attempt.testId).lean();
    const studentData = await User.findById(student.id).lean();
    
    // Fetch questions for analysis
    let questions = [];
    if (attempt.selectedQuestions && attempt.selectedQuestions.length > 0) {
      const questionIds = attempt.selectedQuestions.map(sq => sq.questionId);
      questions = await Question.find({ _id: { $in: questionIds } }).lean();
      // Maintain order from selectedQuestions
      const orderMap = {};
      attempt.selectedQuestions.forEach((sq, idx) => {
        orderMap[sq.questionId.toString()] = idx;
      });
      questions.sort((a, b) => (orderMap[a._id.toString()] ?? 0) - (orderMap[b._id.toString()] ?? 0));
    } else {
      questions = await Question.find({ testId: attempt.testId._id || attempt.testId }).lean();
    }

    // Calculate rank
    const higherScores = await TestAttempt.countDocuments({
      testId: attempt.testId._id || attempt.testId,
      status: { $in: ["submitted", "auto_submitted"] },
      score: { $gt: attempt.score }
    });
    const rank = higherScores + 1;
    const totalParticipants = await TestAttempt.countDocuments({
      testId: attempt.testId._id || attempt.testId,
      status: { $in: ["submitted", "auto_submitted"] }
    });

    // Generate PDF
    const pdfDoc = await generateResultPDF(attempt, test, studentData, questions, rank, totalParticipants);
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="result-${attempt._id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ success: false, message: "Failed to generate PDF" }, { status: 500 });
  }
}
