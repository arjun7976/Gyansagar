import { currentStudent } from "../../../../lib/student-auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import TestAttempt from "../../../../models/TestAttempt";
import Test from "../../../../models/Test"; // Ensure Test model is registered
import Question from "../../../../models/Question";
import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";

import ResultActionButtons from "./ResultActionButtons";
import QuestionAnalysis from "./QuestionAnalysis";

export default async function ResultPage({ params }) {
  const student = await currentStudent();
  if (!student) redirect("/login");
  
  const { id } = await params;

  await connectToDatabase();
  
  const attempt = await TestAttempt.findOne({ _id: id, studentId: student.id })
    .populate("testId", "title subject totalMarks passingPercentage negativeMarks")
    .lean();

  if (!attempt) {
    return (
      <div className="p-8 max-w-3xl mx-auto bg-red-50 text-red-700 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>Attempt not found or you don't have permission to view it.</p>
        <Link href="/student" className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded">Go to Dashboard</Link>
      </div>
    );
  }

  if (!attempt.testId) {
    return (
      <div className="p-8 max-w-3xl mx-auto bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 mt-10">
        <h2 className="text-xl font-bold mb-2">Test Unavailable</h2>
        <p>The original test associated with this attempt has been removed or deleted by the administrator.</p>
        <div className="mt-4 p-4 bg-white rounded border border-yellow-100 shadow-sm inline-block">
          <p className="font-semibold text-gray-500 text-sm uppercase tracking-wider">Your Recorded Score</p>
          <p className="text-4xl font-bold text-gray-800 mt-1">{attempt.score}</p>
          <p className="text-sm font-medium text-gray-500 mt-1">{attempt.percentage}% - {attempt.passed ? 'PASS' : 'FAIL'}</p>
        </div>
        <div className="block mt-6">
          <Link href="/student" className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-medium transition">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (attempt.status === "in_progress") {
    return (
      <div className="p-8 max-w-3xl mx-auto bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
        <h2 className="text-xl font-bold mb-2">Test In Progress</h2>
        <p>You have not submitted this test yet.</p>
        <Link href={`/student/tests/${attempt.testId._id}/attempt`} className="mt-4 inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-medium">
          Resume Test
        </Link>
      </div>
    );
  }

  const isPass = attempt.passed;
  
  // Format Time Taken
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // Fetch Rank
  let rank = "-";
  let totalParticipants = "-";
  try {
    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const rankRes = await fetch(`${protocol}://${host}/api/student/tests/${attempt.testId._id}/rank`, {
      headers: { cookie: h.get("cookie") || "" }
    });
    const rankData = await rankRes.json();
    if (rankData.success) {
      rank = rankData.rank;
      totalParticipants = rankData.totalParticipants;
    }
  } catch (e) {
    console.error("Failed to fetch rank for result page", e);
  }

  // Fetch Questions for Analysis
  const questions = await Question.find({ testId: attempt.testId._id }).lean();
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Result Card */}
      <div className="bg-white shadow rounded-2xl overflow-hidden border border-gray-100">
        <div className={`px-8 py-10 text-white text-center ${isPass ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
          <h1 className="text-xl tracking-widest font-bold opacity-80 uppercase mb-4">Test Completed</h1>
          <h2 className="text-4xl font-extrabold mb-2">{attempt.testId.title}</h2>
          <p className="text-2xl font-bold mt-4 px-6 py-2 bg-white/20 inline-block rounded-full">Result: {isPass ? 'PASS' : 'FAIL'}</p>
        </div>

        <div className="p-8">
          <div className="flex flex-col items-center justify-center mb-10">
            <div className="w-48 h-48 rounded-full border-8 border-gray-50 flex flex-col items-center justify-center bg-white shadow-inner relative">
               <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-gray-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path className={isPass ? "text-green-500" : "text-red-500"} strokeDasharray={`${attempt.percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
               </svg>
              <div className="text-center z-10">
                <span className="text-4xl font-black text-gray-800">{attempt.score}</span>
                <span className="text-gray-400 font-medium">/{attempt.testId.totalMarks}</span>
                <span className="block text-sm text-gray-500 font-medium mt-1">{attempt.percentage}% Score</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
              <span className="block text-gray-500 text-sm font-medium mb-1">Rank</span>
              <span className="block text-2xl font-bold text-gray-800">{rank} <span className="text-sm font-normal text-gray-400">/ {totalParticipants}</span></span>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
              <span className="block text-gray-500 text-sm font-medium mb-1">Accuracy</span>
              <span className="block text-2xl font-bold text-blue-600">{attempt.accuracy}%</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
              <span className="block text-gray-500 text-sm font-medium mb-1">Time Taken</span>
              <span className="block text-2xl font-bold text-purple-600">{formatTime(attempt.timeTakenSeconds)}</span>
            </div>
            
            <div className="bg-green-50 rounded-xl p-5 border border-green-100 text-center">
              <span className="block text-green-700 text-sm font-medium mb-1">Correct</span>
              <span className="block text-2xl font-bold text-green-700">{attempt.correctAnswers}</span>
            </div>
            <div className="bg-red-50 rounded-xl p-5 border border-red-100 text-center">
              <span className="block text-red-700 text-sm font-medium mb-1">Wrong</span>
              <span className="block text-2xl font-bold text-red-700">{attempt.wrongAnswers}</span>
            </div>
            <div className="bg-gray-100 rounded-xl p-5 border border-gray-200 text-center">
              <span className="block text-gray-600 text-sm font-medium mb-1">Unattempted</span>
              <span className="block text-2xl font-bold text-gray-700">{attempt.unattemptedAnswers}</span>
            </div>
          </div>

          <ResultActionButtons 
            attemptId={id} 
            testId={attempt.testId._id.toString()} 
            title={attempt.testId.title} 
            percentage={attempt.percentage} 
          />
        </div>
      </div>

      {/* Question-wise Analysis */}
      <QuestionAnalysis questions={questions} attempt={attempt} />
    </div>
  );
}
