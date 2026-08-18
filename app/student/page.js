import { currentStudent } from "../../lib/student-auth";
import { connectToDatabase } from "../../lib/mongodb";
import TestAttempt from "../../models/TestAttempt";
import Test from "../../models/Test";
import Link from "next/link";
import { redirect } from "next/navigation";
import PerformanceChart from "../../components/student/PerformanceChart";

export default async function StudentDashboard() {
  const student = await currentStudent();
  if (!student) {
    redirect("/login");
  }

  await connectToDatabase();

  // Fetch all attempts for analytics
  const allAttempts = await TestAttempt.find({ studentId: student.id })
    .populate("testId", "title subject totalMarks duration")
    .sort({ submittedAt: 1 })
    .lean();

  const completedAttempts = allAttempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
  const inProgressAttempts = allAttempts.filter(a => a.status === "in_progress");

  const totalAttempts = completedAttempts.length;
  let averageScore = 0;
  let averagePercentage = 0;
  let passedCount = 0;
  const subjects = {};

  completedAttempts.forEach(a => {
    averageScore += a.score || 0;
    averagePercentage += a.percentage || 0;
    if (a.passed) passedCount++;

    const sub = a.testId?.subject || "Other";
    if (!subjects[sub]) {
      subjects[sub] = { attempts: 0, percentage: 0, accuracy: 0 };
    }
    subjects[sub].attempts++;
    subjects[sub].percentage += (a.percentage || 0);
    subjects[sub].accuracy += (a.accuracy || 0);
  });

  if (totalAttempts > 0) {
    averageScore = (averageScore / totalAttempts).toFixed(2);
    averagePercentage = (averagePercentage / totalAttempts).toFixed(2);
  }

  const subjectStats = Object.keys(subjects).map(sub => ({
    subject: sub,
    attempts: subjects[sub].attempts,
    avgPercentage: (subjects[sub].percentage / subjects[sub].attempts).toFixed(1),
    avgAccuracy: (subjects[sub].accuracy / subjects[sub].attempts).toFixed(1)
  }));

  // Fetch available published tests
  const availableTests = await Test.find({ status: "published" })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {student.name}</h1>
        <p className="text-gray-500 mt-1">Here is a summary of your performance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6 border-t-4 border-blue-500">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tests Attempted</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalAttempts}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-t-4 border-green-500">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tests Passed</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{passedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-t-4 border-purple-500">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Avg Percentage</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{averagePercentage}%</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-t-4 border-yellow-500">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Avg Score</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{averageScore}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Subject-Wise Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800">Subject-Wise Performance</h2>
          </div>
          <div className="p-6">
            {subjectStats.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Not enough data available yet.</p>
            ) : (
              <div className="space-y-6">
                {subjectStats.map(s => (
                  <div key={s.subject}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-semibold text-gray-800">{s.subject} <span className="text-xs text-gray-400 font-normal ml-1">({s.attempts} tests)</span></span>
                      <span className="text-sm font-bold text-blue-600">{s.avgPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${s.avgPercentage}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">Avg Accuracy: {s.avgAccuracy}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance Trend */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800">Performance Trend</h2>
          </div>
          <div className="p-6 h-64">
             <PerformanceChart data={completedAttempts.slice(-10).map(a => ({ percentage: a.percentage, score: a.score, fullTitle: a.testId?.title || "Test" }))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Tests */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800">Available Tests</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {availableTests.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No tests are currently available.</p>
            ) : (
              availableTests.map((test) => (
                <div key={test._id.toString()} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-900">{test.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{test.subject} • {test.duration} Minutes • {test.totalMarks} Marks</p>
                  </div>
                  <Link 
                    href={`/student/tests/${test._id}`}
                    className="shrink-0 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
                  >
                    View Details
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Performance History */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800">My Performance History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {inProgressAttempts.length > 0 && inProgressAttempts.map(attempt => (
               <div key={attempt._id.toString()} className="p-6 flex justify-between items-center gap-4 bg-yellow-50/50">
                  <div>
                    <h3 className="font-bold text-yellow-900">{attempt.testId?.title}</h3>
                    <p className="text-sm text-yellow-700 mt-1">Status: In Progress</p>
                  </div>
                  <Link href={`/student/tests/${attempt.testId?._id}/attempt`} className="shrink-0 bg-yellow-500 text-white hover:bg-yellow-600 px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm">
                    Resume
                  </Link>
               </div>
            ))}
            
            {completedAttempts.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">You haven't completed any tests yet.</p>
            ) : (
              completedAttempts.slice().reverse().slice(0, 5).map((attempt) => (
                <div key={attempt._id.toString()} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-900">{attempt.testId?.title || "Unknown Test"}</h3>
                    <div className="flex items-center space-x-3 mt-2">
                       <span className={`px-2 py-0.5 rounded text-xs font-bold ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                         {attempt.passed ? 'PASS' : 'FAIL'}
                       </span>
                       <span className="text-sm font-medium text-gray-600">{attempt.score} / {attempt.testId?.totalMarks} ({attempt.percentage}%)</span>
                    </div>
                  </div>
                  <Link
                    href={`/student/results/${attempt._id}`}
                    className="shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    View Result
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
