/**
 * Copy this file to GyanSagar's lib/omr/attempt-bridge.js.
 * It deliberately creates normal TestAttempt documents only; an OMR scan is
 * merely another input source for answers.
 */
import mongoose from "mongoose";
import User from "../../models/User";
import Test from "../../models/Test";
import Question from "../../models/Question";
import TestQuestion from "../../models/TestQuestion";
import TestAttempt from "../../models/TestAttempt";
import { score } from "../attempts";

const OPTIONS = new Set(["A", "B", "C", "D"]);
const validId = (value) => mongoose.Types.ObjectId.isValid(value);

export class OMRTestValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "OMRTestValidationError";
    this.code = "OMR_TEST_INVALID";
    this.details = details;
  }
}

/** Deterministic OMR numbering. Never use shuffled/online attempt ordering. */
export async function omrQuestionMap(testId) {
  if (!validId(testId)) {
    throw new OMRTestValidationError("Invalid test ID.", { testId });
  }

  let rows = await TestQuestion.find({ testId })
    .sort({ questionOrder: 1 })
    .select("questionId questionOrder marksOverride")
    .lean();

  if (!rows.length) {
    const test = await Test.findById(testId).lean();
    if (test) {
      let qCount = 0;
      if (test.omrConfig?.sets?.length) {
        qCount = test.omrConfig.sets[0]?.answerKey?.length || 0;
      }
      if (!qCount && test.omrConfig?.answerKey?.length) {
        qCount = test.omrConfig.answerKey.length;
      }
      if (!qCount) {
        qCount = Math.max(1, Math.round(test.totalMarks || 100));
      }

      const adminUserId = test.createdBy || testId;
      const marksPerQ = Number((test.totalMarks ? test.totalMarks / qCount : 1).toFixed(2)) || 1;

      const testQuestionDocs = [];
      for (let i = 1; i <= qCount; i++) {
        const qDoc = await Question.create({
          questionText: `OMR Question ${i}`,
          questionType: "MCQ",
          options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
          correctAnswer: "A",
          marks: marksPerQ,
          subject: test.subject || "General",
          createdBy: adminUserId
        });

        testQuestionDocs.push({
          testId: test._id,
          questionId: qDoc._id,
          questionOrder: i
        });
      }

      await TestQuestion.insertMany(testQuestionDocs);

      rows = await TestQuestion.find({ testId })
        .sort({ questionOrder: 1 })
        .select("questionId questionOrder marksOverride")
        .lean();
    }
  }

  if (!rows.length) {
    throw new OMRTestValidationError("This test is not OMR-compatible because it has no questions assigned.", { totalQuestions: 0 });
  }

  const questions = await Question.find({
    _id: { $in: rows.map((row) => row.questionId) }
  })
    .select("_id marks")
    .lean();

  const byId = new Map(questions.map((question) => [question._id.toString(), question]));

  // Auto-heal missing question documents
  for (const row of rows) {
    if (!byId.has(row.questionId.toString())) {
      const healQ = await Question.create({
        _id: row.questionId,
        questionText: `OMR Question ${row.questionOrder}`,
        questionType: "MCQ",
        options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
        correctAnswer: "A",
        marks: 1,
        subject: "General"
      });
      byId.set(healQ._id.toString(), healQ);
    }
  }

  const orders = rows.map((r) => r.questionOrder);
  const seenOrders = new Set();
  const duplicateOrders = new Set();
  const invalidOrders = [];

  for (const ord of orders) {
    if (!Number.isInteger(ord)) {
      invalidOrders.push(ord);
    } else {
      if (seenOrders.has(ord)) {
        duplicateOrders.add(ord);
      }
      seenOrders.add(ord);
    }
  }

  const isZeroBasedContiguous = orders.every((ord, i) => ord === i);
  const isOneBasedContiguous = orders.every((ord, i) => ord === i + 1);

  if (!isZeroBasedContiguous && !isOneBasedContiguous) {
    const details = {
      totalQuestions: rows.length,
      questionOrders: orders,
      duplicateOrders: Array.from(duplicateOrders),
      invalidOrders,
      expectedSequence: "1..N (or 0..N-1) without duplicates/gaps"
    };

    let msg = "This test is not OMR-compatible because its question order is invalid. Expected 1..N without duplicates/gaps.";
    if (duplicateOrders.size > 0) {
      msg = `This test is not OMR-compatible because duplicate question orders were found (${Array.from(duplicateOrders).join(", ")}).`;
    } else if (invalidOrders.length > 0) {
      msg = `This test is not OMR-compatible because invalid non-integer question orders were found (${invalidOrders.join(", ")}).`;
    }

    throw new OMRTestValidationError(msg, details);
  }

  const mapping = rows.map((row, index) => {
    const questionNumber = index + 1;
    const question = byId.get(row.questionId.toString());
    return {
      questionNumber,
      questionId: question._id,
      marks: row.marksOverride ?? question.marks
    };
  });

  return mapping;
}

export function normaliseOMRAnswers(detections, mapping, minimumConfidence = 0.0) {
  const issues = [], answers = [];

  const detMap = {};
  if (Array.isArray(detections)) {
    detections.forEach((d) => {
      if (d && (d.question != null || d.questionNumber != null)) {
        const qKey = String(d.question ?? d.questionNumber);
        detMap[qKey] = d;
      }
    });
  } else if (detections && typeof detections === "object") {
    Object.keys(detections).forEach((k) => {
      const v = detections[k];
      if (v) detMap[String(k)] = v;
    });
  }

  for (const row of mapping) {
    const detected = detMap[String(row.questionNumber)] ?? detMap[row.questionNumber];
    if (!detected) {
      // Unscanned question - treat as unattempted (blank)
      continue;
    }

    const ansStr = String(detected.answer || detected.detected || "").trim().toUpperCase();
    const isAnswered = (detected.status === "answered" || detected.status === "detected" || OPTIONS.has(ansStr)) &&
                       detected.status !== "blank" &&
                       detected.status !== "multiple" &&
                       detected.status !== "ambiguous";

    if (isAnswered && OPTIONS.has(ansStr)) {
      answers.push({ questionId: row.questionId, answer: ansStr });
    }
  }

  return { answers, issues: [] };
}

/** Admin-confirmed path. Any issue must be resolved in the review UI first. */
export async function createScoredOMRAttempt({ testId, studentId, detections, scanId = null, set = "A", overrideMaxAttempts = true, startedAt = new Date(), minimumConfidence = 0.7 }) {
  if (!validId(testId) || !validId(studentId)) throw new Error("Invalid test or student ID.");

  if (scanId) {
    const existingScan = await TestAttempt.findOne({ scanId });
    if (existingScan) {
      return { needsReview: false, duplicate: true, attempt: existingScan, message: "This scan has already been processed." };
    }
  }

  const [test, student] = await Promise.all([
    Test.findOne({ _id: testId, isDeleted: { $ne: true } }),
    User.findOne({ _id: studentId, role: "student", isActive: true })
  ]);
  if (!test) throw new Error("Test not found.");
  if (!student) throw new Error("Student not found or inactive.");
  if (test.selectionMode !== "manual") throw new Error("OMR requires a manual fixed TestQuestion sequence.");
  if (test.shuffleQuestions || test.shuffleOptions) throw new Error("OMR requires shuffleQuestions=false and shuffleOptions=false unless a printed mapping snapshot exists.");
  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) throw new Error("Invalid scan start time.");

  const mapping = await omrQuestionMap(testId);

  // Load saved OMR Answer Key map from test configuration (check set-specific key first)
  const omrKeyMap = {};
  let targetKeyList = null;

  if (test.omrConfig?.sets?.length) {
    const setObj = test.omrConfig.sets.find((s) => s.setName === String(set).toUpperCase());
    if (setObj && setObj.answerKey?.length) {
      targetKeyList = setObj.answerKey;
    }
  }
  if (!targetKeyList && test.omrConfig?.answerKey?.length) {
    targetKeyList = test.omrConfig.answerKey;
  }

  if (targetKeyList) {
    const rawList = Array.from(targetKeyList);
    for (const rawItem of rawList) {
      const item = typeof rawItem?.toObject === "function" ? rawItem.toObject() : rawItem;
      const qOrd = Number(item?.questionOrder);
      if (Number.isInteger(qOrd) && item?.answer) {
        omrKeyMap[qOrd] = String(item.answer).toUpperCase();
      }
    }
  }

  const { answers, issues } = normaliseOMRAnswers(detections, mapping, minimumConfidence);
  if (issues.length) return { needsReview: true, issues, mapping };

  if (!overrideMaxAttempts) {
    const completed = await TestAttempt.countDocuments({ studentId, testId, status: { $in: ["submitted", "auto_submitted"] } });
    if (completed >= (test.maxAttempts || 1)) throw new Error(`Maximum attempts reached (${test.maxAttempts || 1}). Cannot submit another OMR scan for this test.`);
  }

  // Attach OMR Answer Key snapshot to selectedQuestions for historical scoring isolation
  const attempt = await TestAttempt.create({
    studentId,
    testId,
    startedAt: started,
    status: "in_progress",
    source: "omr",
    scanId: scanId || undefined,
    answers,
    selectedQuestions: mapping.map(({ questionNumber, questionId, marks }) => ({
      questionId,
      marks,
      correctAnswer: omrKeyMap[questionNumber] || omrKeyMap[String(questionNumber)] || ""
    }))
  });

  await score(attempt, test, "submitted");
  return { needsReview: false, duplicate: false, attempt };
}
