import TestAttempt from "../models/TestAttempt";
import Question from "../models/Question";
import User from "../models/User";
import Test from "../models/Test";
import { createNotificationJob } from "./notifications/queue";
import { createCertificateIfEligible } from "./certificate";

export function remaining(a, d) {
  return Math.max(0, Math.floor((new Date(a.startedAt).getTime() + d * 60000 - Date.now()) / 1000));
}

export async function expireIfNeeded(a, test) {
  const r = remaining(a, test.duration);
  if (a.status === "in_progress" && r === 0) return score(a, test, "auto_submitted");
  return r;
}

export async function score(a, test, status = "submitted") {
  let qs;
  if (a.selectedQuestions && a.selectedQuestions.length > 0) {
    const ids = a.selectedQuestions.map(sq => sq.questionId);
    const qDocs = await Question.find({ _id: { $in: ids } }).select("_id correctAnswer marks").lean();
    const qMap = {};
    qDocs.forEach(q => { qMap[q._id.toString()] = q; });
    const sqMarksMap = {};
    a.selectedQuestions.forEach(sq => { sqMarksMap[sq.questionId.toString()] = sq.marks; });
    qs = ids.map(id => ({ _id: id, correctAnswer: qMap[id.toString()]?.correctAnswer, marks: sqMarksMap[id.toString()] ?? qMap[id.toString()]?.marks ?? 1 }));
  } else {
    qs = await Question.find({ testId: test._id }).select("_id correctAnswer marks").lean();
  }
  let correct = 0, wrong = 0, un = 0, sc = 0;
  for (const q of qs) {
    const ans = a.answers.find(x => x.questionId.toString() === q._id.toString())?.answer;
    if (!ans) un++;
    else if (ans === q.correctAnswer) { correct++; sc += q.marks; }
    else { wrong++; sc -= test.negativeMarks; }
  }
  a.status = status;
  a.submittedAt = new Date();
  const timeTaken = Math.max(0, Math.floor((a.submittedAt.getTime() - new Date(a.startedAt).getTime()) / 1000));
  a.score = Number(sc.toFixed(2));
  a.correctAnswers = correct;
  a.wrongAnswers = wrong;
  a.unattemptedAnswers = un;
  a.totalQuestions = qs.length;
  const perc = qs.length ? Number((a.score / test.totalMarks * 100).toFixed(2)) : 0;
  a.percentage = perc;
  a.accuracy = (correct + wrong) > 0 ? Number((correct / (correct + wrong) * 100).toFixed(2)) : 0;
  a.timeTakenSeconds = Math.min(timeTaken, test.duration * 60);
  a.passed = perc >= test.passingPercentage;
  a.timeRemaining = 0;
  await a.save();

  // Create certificate if eligible (non-blocking)
  // Certificate generation is now handled separately by admin when the test ends to ensure accurate ranking.

  // Create notification jobs (non-blocking)
  const student = await User.findById(a.studentId);
  if (student) {
    // Result email notification
    if (test.emailNotifications?.result && student.email) {
      createNotificationJob({
        userId: student._id,
        type: "result",
        channel: "email",
        recipient: student.email,
        referenceId: a._id
      }).catch(err => console.error("Email notification job failed:", err));
    }
    // Result WhatsApp notification
    if (test.whatsappNotifications?.result && student.mobile) {
      createNotificationJob({
        userId: student._id,
        type: "result",
        channel: "whatsapp",
        recipient: student.mobile,
        referenceId: a._id
      }).catch(err => console.error("WhatsApp notification job failed:", err));
    }
  }

  return 0;
}

export const publicQuestions = qs => qs.map(q => ({ _id: q._id, questionText: q.questionText, options: q.options, marks: q.marks }));