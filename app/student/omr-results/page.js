"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function StudentOMRResultsPage() {
  const [results, setResults] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOMRResults();
  }, []);

  async function fetchOMRResults() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/omr-results");
      const data = await res.json();
      if (res.ok && data.success) {
        setResults(data.results || []);
        setStudentName(data.studentName || "");
      } else {
        setError(data.message || "Unable to load OMR results.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <span>📄 OMR Evaluation Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Offline OMR Results
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              ऑफलाइन OMR परीक्षा परिणाम — Verified official evaluation records
            </p>
          </div>
          {studentName && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 px-4 text-right border border-white/10">
              <p className="text-xs text-blue-200 uppercase font-semibold tracking-wider">Student Profile</p>
              <p className="font-bold text-white text-base">{studentName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
          <p className="text-gray-600 font-medium">Loading your OMR test results...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-center">
          <p className="font-semibold text-base">{error}</p>
          <button
            onClick={fetchOMRResults}
            className="mt-3 bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border shadow-sm space-y-3">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            📋
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Offline OMR Results Available</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            No offline OMR test evaluations have been recorded for your account yet. Once an offline OMR test is evaluated by the institute, your verified result will appear here.
          </p>
          <Link
            href="/student"
            className="inline-block bg-blue-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-900 transition mt-2"
          >
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {results.map((result) => (
            <div
              key={result._id}
              className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                      {result.subject}
                    </span>
                    <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                      Offline OMR
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{result.testTitle}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Evaluated on: {new Date(result.submittedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Score</p>
                    <p className="text-2xl font-black text-blue-900">
                      {result.score} <span className="text-sm font-normal text-slate-500">/ {result.totalMarks}</span>
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider ${
                    result.passed ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    {result.passed ? "PASSED" : "FAILED"}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-center">
                <div className="p-2">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Percentage</p>
                  <p className="text-lg font-bold text-slate-900">{result.percentage}%</p>
                </div>
                <div className="p-2 border-l border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Accuracy</p>
                  <p className="text-lg font-bold text-slate-900">{result.accuracy}%</p>
                </div>
                <div className="p-2 border-l border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Attempted</p>
                  <p className="text-lg font-bold text-slate-900">
                    {result.correctAnswers + result.wrongAnswers} / {result.totalQuestions}
                  </p>
                </div>
                <div className="p-2 border-l border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Unanswered</p>
                  <p className="text-lg font-bold text-slate-900">{result.unattemptedAnswers}</p>
                </div>
              </div>

              {/* Detail Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-1">
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Correct: {result.correctAnswers}
                  </span>
                  <span className="text-red-700 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                    Wrong: {result.wrongAnswers}
                  </span>
                  <span className="text-slate-600 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                    Blank: {result.unattemptedAnswers}
                  </span>
                </div>
                
                <Link
                  href={`/student/results/${result._id}`}
                  className="text-blue-700 hover:text-blue-900 font-bold text-xs flex items-center gap-1 transition"
                >
                  View Full Result Analysis →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
