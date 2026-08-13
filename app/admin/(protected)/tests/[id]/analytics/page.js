"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Link from "next/link";

export default function AdminTestAnalyticsPage({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/tests/${id}/analytics`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnalytics(data.analytics);
        } else {
          setError(data.message || "Failed to load analytics.");
        }
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [id]);

  const formatTime = (seconds) => {
    if (!seconds) return "0m 0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading test analytics...</div>;
  if (error) return <div className="p-12 text-center text-red-500 font-medium">{error}</div>;
  if (!analytics) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Test Analytics</h1>
          <p className="text-gray-500 mt-1">Aggregated performance data for this test</p>
        </div>
        <Link 
          href="/admin/results"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Results
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Participants</h3>
          <p className="text-4xl font-black text-gray-900">{analytics.totalParticipants}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Average Score</h3>
          <p className="text-4xl font-black text-blue-600">{analytics.averageScore}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Avg Percentage</h3>
          <p className="text-4xl font-black text-purple-600">{analytics.averagePercentage}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Avg Accuracy</h3>
          <p className="text-4xl font-black text-teal-600">{analytics.averageAccuracy}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Score Distribution</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-gray-600">Highest Score</span>
              <span className="font-bold text-green-600 text-xl">{analytics.highestScore}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-gray-600">Average Score</span>
              <span className="font-bold text-blue-600 text-xl">{analytics.averageScore}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-gray-600">Lowest Score</span>
              <span className="font-bold text-red-600 text-xl">{analytics.lowestScore}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Pass / Fail Ratio</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-gray-600">Passed</span>
              <span className="font-bold text-green-600 text-xl">{analytics.passCount}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-gray-600">Failed</span>
              <span className="font-bold text-red-600 text-xl">{analytics.failCount}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-gray-600">Average Time Taken</span>
              <span className="font-bold text-gray-800 text-xl">{formatTime(analytics.averageTime)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
