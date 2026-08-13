import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Question from "../../../../models/Question";
import TestQuestion from "../../../../models/TestQuestion";
import { requireAdmin } from "../../../../lib/admin";

// POST /api/admin/migrate-v6
// Run once to create TestQuestion records for all legacy questions that still have testId
export async function POST(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await connectToDatabase();

    // Find all questions that still have a testId (legacy pattern)
    const legacyQuestions = await Question.find({ testId: { $exists: true, $ne: null } })
      .select("_id testId marks")
      .lean();

    if (!legacyQuestions.length) {
      return NextResponse.json({ success: true, message: "No legacy questions found. Migration not needed.", migrated: 0 });
    }

    let migrated = 0;
    let skipped = 0;

    for (const q of legacyQuestions) {
      const exists = await TestQuestion.exists({ testId: q.testId, questionId: q._id });
      if (!exists) {
        await TestQuestion.create({ testId: q.testId, questionId: q._id, questionOrder: 0 });
        migrated++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. ${migrated} records created, ${skipped} already existed.`,
      migrated,
      skipped
    });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
