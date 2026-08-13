import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import TestQuestion from "../../../../../../models/TestQuestion";
import Question from "../../../../../../models/Question";
import { requireAdmin } from "../../../../../../lib/admin";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id: testId } = await params;
    await connectToDatabase();
    const testQuestions = await TestQuestion.find({ testId })
      .populate({
        path: "questionId",
        populate: [
          { path: "subjectId", select: "name" },
          { path: "chapterId", select: "name" },
          { path: "topicId", select: "name" }
        ]
      })
      .sort({ questionOrder: 1 })
      .lean();
    return NextResponse.json({ success: true, data: testQuestions });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id: testId } = await params;
    await connectToDatabase();
    const body = await req.json();
    // Support bulk add: { questionIds: [...] } or single { questionId }
    const questionIds = body.questionIds || (body.questionId ? [body.questionId] : []);
    if (!questionIds.length) return NextResponse.json({ success: false, message: "No question IDs provided." }, { status: 400 });

    // Validate all IDs
    const valid = questionIds.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!valid) return NextResponse.json({ success: false, message: "Invalid question ID(s)." }, { status: 400 });

    // Get current max order
    const maxOrderDoc = await TestQuestion.findOne({ testId }).sort({ questionOrder: -1 }).select("questionOrder").lean();
    let nextOrder = (maxOrderDoc?.questionOrder ?? -1) + 1;

    // Check which ones already exist
    const existing = await TestQuestion.find({ testId, questionId: { $in: questionIds } }).select("questionId").lean();
    const existingIds = new Set(existing.map(e => e.questionId.toString()));

    const toInsert = questionIds.filter(id => !existingIds.has(id));
    const duplicates = questionIds.filter(id => existingIds.has(id));

    if (toInsert.length === 0) {
      return NextResponse.json({ success: false, message: "All selected question(s) are already in this test.", duplicates }, { status: 409 });
    }

    const docs = toInsert.map(qId => ({ testId, questionId: qId, questionOrder: nextOrder++ }));
    await TestQuestion.insertMany(docs);

    return NextResponse.json({
      success: true,
      added: toInsert.length,
      duplicates: duplicates.length,
      message: `Added ${toInsert.length} question(s). ${duplicates.length > 0 ? `${duplicates.length} already existed and were skipped.` : ""}`
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
