import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Question from "../../../../../models/Question";
import TestQuestion from "../../../../../models/TestQuestion";
import { requireAdmin } from "../../../../../lib/admin";

export async function GET(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectToDatabase();
    const question = await Question.findById(id)
      .populate("subjectId", "name")
      .populate("chapterId", "name")
      .populate("topicId", "name")
      .lean();
    if (!question) return NextResponse.json({ success: false, message: "Question not found." }, { status: 404 });

    // Get tests this question is used in
    const usage = await TestQuestion.find({ questionId: id }).populate("testId", "title subject status").lean();
    return NextResponse.json({ success: true, data: { ...question, usage } });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectToDatabase();
    const body = await req.json();
    const tags = Array.isArray(body.tags) ? body.tags.map(t => t.trim()).filter(Boolean) : (body.tags ? body.tags.split(",").map(t => t.trim()).filter(Boolean) : []);
    const question = await Question.findByIdAndUpdate(id, {
      questionText: body.questionText?.trim(),
      options: { A: body.options?.A?.trim(), B: body.options?.B?.trim(), C: body.options?.C?.trim(), D: body.options?.D?.trim() },
      correctAnswer: body.correctAnswer?.toUpperCase(),
      explanation: body.explanation?.trim() || "",
      marks: Number(body.marks) || 1,
      difficulty: body.difficulty || "Medium",
      subject: body.subject?.trim() || "",
      subjectId: body.subjectId || undefined,
      chapterId: body.chapterId || undefined,
      topicId: body.topicId || undefined,
      tags
    }, { new: true, runValidators: true });
    if (!question) return NextResponse.json({ success: false, message: "Question not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: question });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectToDatabase();
    // If question is used in any test, archive instead of delete
    const usage = await TestQuestion.countDocuments({ questionId: id });
    if (usage > 0) {
      await Question.findByIdAndUpdate(id, { isActive: false });
      return NextResponse.json({ success: true, archived: true, message: `Question is used in ${usage} test(s). It has been archived instead of deleted to preserve historical data.` });
    }
    await Question.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Question permanently deleted." });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
