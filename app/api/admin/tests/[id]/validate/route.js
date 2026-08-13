import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import Test from "../../../../../../models/Test";
import TestQuestion from "../../../../../../models/TestQuestion";
import Question from "../../../../../../models/Question";
import { requireAdmin } from "../../../../../../lib/admin";

export async function GET(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id: testId } = await params;
    await connectToDatabase();

    const test = await Test.findById(testId);
    if (!test) return NextResponse.json({ success: false, message: "Test not found." }, { status: 404 });

    const errors = [];

    if (!test.title?.trim()) errors.push("Test title is required.");
    if (!test.duration || test.duration < 1) errors.push("Duration must be at least 1 minute.");
    if (!test.totalMarks || test.totalMarks < 1) errors.push("Total marks must be at least 1.");

    if (test.selectionMode === "random") {
      const rc = test.randomConfig;
      const total = rc?.totalQuestions || 0;
      const dist = rc?.difficultyDistribution || {};
      const hasDist = (dist.Easy || 0) + (dist.Medium || 0) + (dist.Hard || 0) > 0;

      if (total < 1 && !hasDist) {
        errors.push("Random pool must specify total questions or difficulty distribution.");
      } else if (hasDist) {
        const baseFilter = { isActive: true };
        if (rc.subjectId) baseFilter.subjectId = rc.subjectId;
        if (rc.chapterId) baseFilter.chapterId = rc.chapterId;
        if (rc.topicId) baseFilter.topicId = rc.topicId;

        const [easyAvail, medAvail, hardAvail] = await Promise.all([
          Question.countDocuments({ ...baseFilter, difficulty: "Easy" }),
          Question.countDocuments({ ...baseFilter, difficulty: "Medium" }),
          Question.countDocuments({ ...baseFilter, difficulty: "Hard" })
        ]);
        if ((dist.Easy || 0) > easyAvail) errors.push(`Not enough Easy questions. Required: ${dist.Easy}, Available: ${easyAvail}`);
        if ((dist.Medium || 0) > medAvail) errors.push(`Not enough Medium questions. Required: ${dist.Medium}, Available: ${medAvail}`);
        if ((dist.Hard || 0) > hardAvail) errors.push(`Not enough Hard questions. Required: ${dist.Hard}, Available: ${hardAvail}`);
      } else {
        const baseFilter = { isActive: true };
        if (rc.subjectId) baseFilter.subjectId = rc.subjectId;
        const avail = await Question.countDocuments(baseFilter);
        if (total > avail) errors.push(`Not enough questions. Required: ${total}, Available: ${avail}`);
      }
    } else {
      const count = await TestQuestion.countDocuments({ testId });
      if (count === 0) errors.push("Test has no questions. Add at least 1 question before publishing.");
    }

    if (errors.length > 0) {
      return NextResponse.json({ success: false, canPublish: false, errors });
    }
    return NextResponse.json({ success: true, canPublish: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
