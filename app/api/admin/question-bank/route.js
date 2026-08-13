import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Question from "../../../../models/Question";
import TestQuestion from "../../../../models/TestQuestion";
import { requireAdmin } from "../../../../lib/admin";

export async function GET(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const search = searchParams.get("search")?.trim();
    const subjectId = searchParams.get("subjectId");
    const chapterId = searchParams.get("chapterId");
    const topicId = searchParams.get("topicId");
    const difficulty = searchParams.get("difficulty");
    const statusFilter = searchParams.get("status"); // "active" | "archived"
    const tags = searchParams.get("tags");

    const filter = {};
    if (search) filter.$or = [{ questionText: { $regex: search, $options: "i" } }, { tags: { $regex: search, $options: "i" } }];
    if (subjectId) filter.subjectId = subjectId;
    if (chapterId) filter.chapterId = chapterId;
    if (topicId) filter.topicId = topicId;
    if (difficulty) filter.difficulty = difficulty;
    if (tags) filter.tags = { $in: tags.split(",").map(t => t.trim()) };
    if (statusFilter === "archived") filter.isActive = false;
    else if (statusFilter === "active") filter.isActive = true;

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .populate("subjectId", "name")
        .populate("chapterId", "name")
        .populate("topicId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Question.countDocuments(filter)
    ]);

    // Count how many tests each question is used in
    const questionIds = questions.map(q => q._id);
    const usageCounts = await TestQuestion.aggregate([
      { $match: { questionId: { $in: questionIds } } },
      { $group: { _id: "$questionId", count: { $sum: 1 } } }
    ]);
    const usageMap = {};
    usageCounts.forEach(u => { usageMap[u._id.toString()] = u.count; });

    const enriched = questions.map(q => ({ ...q, usedInTests: usageMap[q._id.toString()] || 0 }));

    return NextResponse.json({ success: true, data: enriched, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) {
    console.error("Question Bank GET Error:", e);
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const body = await req.json();
    const questionText = body.questionText?.trim();
    if (!questionText) return NextResponse.json({ success: false, message: "Question text is required." }, { status: 400 });

    // Basic duplicate detection: normalize and compare
    const normalized = questionText.toLowerCase().replace(/\s+/g, " ").trim();
    const potentialDuplicate = await Question.findOne({ questionText: { $regex: `^${normalized}$`, $options: "i" } }).select("_id questionText").lean();
    if (potentialDuplicate) {
      return NextResponse.json({
        success: false,
        possibleDuplicate: true,
        message: "Possible duplicate found. A question with similar text already exists.",
        existing: { id: potentialDuplicate._id, questionText: potentialDuplicate.questionText }
      }, { status: 409 });
    }

    const tags = Array.isArray(body.tags) ? body.tags.map(t => t.trim()).filter(Boolean) : (body.tags ? body.tags.split(",").map(t => t.trim()).filter(Boolean) : []);

    const question = await Question.create({
      questionText,
      questionType: body.questionType || "MCQ",
      options: { A: body.options?.A?.trim(), B: body.options?.B?.trim(), C: body.options?.C?.trim(), D: body.options?.D?.trim() },
      correctAnswer: body.correctAnswer?.toUpperCase(),
      explanation: body.explanation?.trim() || "",
      marks: Number(body.marks) || 1,
      difficulty: body.difficulty || "Medium",
      subject: body.subject?.trim() || "",
      subjectId: body.subjectId || undefined,
      chapterId: body.chapterId || undefined,
      topicId: body.topicId || undefined,
      tags,
      isActive: true,
      createdBy: admin.userId
    });
    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  }
}
