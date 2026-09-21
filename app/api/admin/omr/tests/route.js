import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { requireAdmin } from "../../../../../lib/admin";
import Test from "../../../../../models/Test";
import Question from "../../../../../models/Question";
import TestQuestion from "../../../../../models/TestQuestion";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    // OMR requires manual question selection, non-shuffled questions & options
    const tests = await Test.find({
      isDeleted: { $ne: true },
      selectionMode: "manual",
      shuffleQuestions: false,
      shuffleOptions: false
    })
      .select("title subject totalMarks duration passingPercentage maxAttempts status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, tests });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch tests." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const questionCount = parseInt(body.questionCount, 10);
    const subject = String(body.subject || "General").trim();
    const duration = parseInt(body.duration || "180", 10);
    const marksPerQuestion = parseFloat(body.marksPerQuestion || 1);
    const passingPercentage = parseFloat(body.passingPercentage || 40);

    if (!title) {
      return NextResponse.json({ success: false, message: "Test Title (Name) is required." }, { status: 400 });
    }

    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 300) {
      return NextResponse.json(
        { success: false, message: "Number of questions must be between 1 and 300." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const adminUserId = admin.userId || admin.user?._id || admin._id;
    const totalMarks = Number((questionCount * marksPerQuestion).toFixed(2));

    // Create OMR Compatible Test Document
    const newTest = await Test.create({
      title,
      subject,
      duration: duration > 0 ? duration : 180,
      totalMarks,
      passingPercentage: Math.min(100, Math.max(0, passingPercentage)),
      selectionMode: "manual",
      shuffleQuestions: false,
      shuffleOptions: false,
      status: "published",
      createdBy: adminUserId,
      omrConfig: {
        answerKey: Array.from({ length: questionCount }, (_, i) => ({
          questionOrder: i + 1,
          answer: ""
        })),
        updatedAt: new Date()
      }
    });

    // Create questionCount Question & TestQuestion documents (1..N sequence)
    const testQuestionDocs = [];

    for (let i = 1; i <= questionCount; i++) {
      const qDoc = await Question.create({
        questionText: `OMR Question ${i}`,
        questionType: "MCQ",
        options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
        correctAnswer: "A",
        marks: marksPerQuestion,
        subject,
        createdBy: adminUserId
      });

      testQuestionDocs.push({
        testId: newTest._id,
        questionId: qDoc._id,
        questionOrder: i
      });
    }

    await TestQuestion.insertMany(testQuestionDocs);

    return NextResponse.json({
      success: true,
      test: newTest,
      message: `OMR Test "${title}" created successfully with ${questionCount} questions!`
    });
  } catch (error) {
    console.error("Create OMR Test Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create OMR test." },
      { status: 500 }
    );
  }
}
