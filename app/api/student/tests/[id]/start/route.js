import { NextResponse } from "next/server";
import Test from "../../../../../../models/Test";
import Question from "../../../../../../models/Question";
import TestQuestion from "../../../../../../models/TestQuestion";
import TestAttempt from "../../../../../../models/TestAttempt";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import { currentStudent } from "../../../../../../lib/student-auth";

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build question pool for Random selection mode
async function buildRandomPool(test) {
  const rc = test.randomConfig;
  const baseFilter = { isActive: true };
  if (rc.subjectId) baseFilter.subjectId = rc.subjectId;
  if (rc.chapterId) baseFilter.chapterId = rc.chapterId;
  if (rc.topicId) baseFilter.topicId = rc.topicId;
  if (rc.tags && rc.tags.length > 0) baseFilter.tags = { $in: rc.tags };

  const totalRequired = rc.totalQuestions || 0;
  const dist = rc.difficultyDistribution || {};
  const easyCount = dist.Easy || 0;
  const medCount = dist.Medium || 0;
  const hardCount = dist.Hard || 0;
  const hasDist = easyCount + medCount + hardCount > 0;

  let selectedIds = [];

  if (hasDist) {
    // Validate availability first
    const [easyAvail, medAvail, hardAvail] = await Promise.all([
      Question.countDocuments({ ...baseFilter, difficulty: "Easy" }),
      Question.countDocuments({ ...baseFilter, difficulty: "Medium" }),
      Question.countDocuments({ ...baseFilter, difficulty: "Hard" })
    ]);
    const errors = [];
    if (easyCount > easyAvail) errors.push(`Not enough Easy questions. Required: ${easyCount}, Available: ${easyAvail}`);
    if (medCount > medAvail) errors.push(`Not enough Medium questions. Required: ${medCount}, Available: ${medAvail}`);
    if (hardCount > hardAvail) errors.push(`Not enough Hard questions. Required: ${hardCount}, Available: ${hardAvail}`);
    if (errors.length > 0) return { error: errors.join(". ") };

    const [easyQs, medQs, hardQs] = await Promise.all([
      Question.find({ ...baseFilter, difficulty: "Easy" }).select("_id marks").lean(),
      Question.find({ ...baseFilter, difficulty: "Medium" }).select("_id marks").lean(),
      Question.find({ ...baseFilter, difficulty: "Hard" }).select("_id marks").lean()
    ]);
    selectedIds = [
      ...shuffle(easyQs).slice(0, easyCount),
      ...shuffle(medQs).slice(0, medCount),
      ...shuffle(hardQs).slice(0, hardCount)
    ];
  } else {
    // Select totalRequired random from pool
    const pool = await Question.find(baseFilter).select("_id marks").lean();
    if (pool.length < totalRequired) {
      return { error: `Not enough questions available. Required: ${totalRequired}, Available: ${pool.length}` };
    }
    selectedIds = shuffle(pool).slice(0, totalRequired);
  }

  return { questions: selectedIds };
}

export async function POST(_, { params }) {
  const s = await currentStudent();
  const { id } = await params;
  if (!s) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  await connectToDatabase();

  const t = await Test.findOne({ _id: id, status: "published" });
  if (!t) return NextResponse.json({ success: false, message: "Test not available" }, { status: 404 });

  // Check test deadlines
  const now = new Date();
  if (t.startDate && now < new Date(t.startDate)) {
    return NextResponse.json({ success: false, message: `This test will be available from ${new Date(t.startDate).toLocaleString()}` }, { status: 403 });
  }
  if (t.endDate && now > new Date(t.endDate)) {
    return NextResponse.json({ success: false, message: `This test has ended on ${new Date(t.endDate).toLocaleString()}` }, { status: 403 });
  }

  // Resume existing in-progress attempt
  const active = await TestAttempt.findOne({ studentId: s.id, testId: id, status: "in_progress" });
  if (active) return NextResponse.json({ success: true, data: { attemptId: active._id, resumed: true } });

  // Check attempt limits
  const completedAttempts = await TestAttempt.countDocuments({ studentId: s.id, testId: id, status: { $in: ["submitted", "auto_submitted"] } });
  if (completedAttempts >= (t.maxAttempts || 1)) {
    return NextResponse.json({ success: false, message: `You have reached the maximum number of attempts (${t.maxAttempts || 1}) for this test.` }, { status: 403 });
  }

  // Build the question snapshot for this attempt
  let selectedQuestions = [];

  if (t.selectionMode === "random") {
    const result = await buildRandomPool(t);
    if (result.error) return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    selectedQuestions = result.questions; // [{_id, marks}]
  } else {
    // Manual mode: use TestQuestion mapping; fallback to legacy testId field for old data
    const tqs = await TestQuestion.find({ testId: id }).sort({ questionOrder: 1 }).select("questionId marksOverride").lean();
    if (tqs.length > 0) {
      const qDocs = await Question.find({ _id: { $in: tqs.map(q => q.questionId) } }).select("_id marks").lean();
      const marksMap = {};
      tqs.forEach(tq => { marksMap[tq.questionId.toString()] = tq.marksOverride; });
      const qMap = {};
      qDocs.forEach(q => { qMap[q._id.toString()] = q; });
      selectedQuestions = tqs.map(tq => ({ _id: tq.questionId, marks: marksMap[tq.questionId.toString()] ?? qMap[tq.questionId.toString()]?.marks ?? 1 }));
    } else {
      // Legacy: questions directly linked to testId
      const legacyQs = await Question.find({ testId: id }).select("_id marks").lean();
      selectedQuestions = legacyQs;
    }
  }

  if (!selectedQuestions.length) return NextResponse.json({ success: false, message: "This test has no questions yet." }, { status: 400 });

  // Shuffle question order if enabled
  if (t.shuffleQuestions) selectedQuestions = shuffle(selectedQuestions);

  // Save snapshot into the attempt
  const selectedQuestionIds = selectedQuestions.map(q => ({
    questionId: q._id,
    marks: q.marks
  }));

  const a = await TestAttempt.create({
    studentId: s.id,
    testId: id,
    totalQuestions: selectedQuestions.length,
    timeRemaining: t.duration * 60,
    selectedQuestions: selectedQuestionIds
  });

  return NextResponse.json({ success: true, data: { attemptId: a._id, resumed: false } }, { status: 201 });
}