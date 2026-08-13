"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Link from "next/link";

export default function PerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/performance")
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading performance data...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-red-500">Failed to load performance data</div>;
  }

  const { overall, trend, subjectStats, recentHistory } = data;

  const downloadPerformancePDF = async () => {
    try {
      const res = await fetch("/api/student/performance/pdf");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "performance-report.pdf";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error("Failed to download PDF:", e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Performance Report</h1>
          <p className="text-gray-500 mt-1">Track your test performance and progress</p>
        </div>
        <button onClick={downloadPerformancePDF} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
          Download Report PDF
        </button>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Tests Attempted</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">{overall.testsAttempted}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Tests Passed</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{overall.testsPassed}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Tests Failed</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{overall.testsFailed}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Average Score</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{overall.averageScore}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Average Percentage</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">{overall.averagePercentage}%</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Average Accuracy</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{overall.averageAccuracy}%</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Best Score</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{overall.bestScore}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Best Rank</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{overall.bestRank || "-"}</div>
        </div>
      </div>

      {/* Score Trend Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Score Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="testName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="percentage" stroke="#2563eb" strokeWidth={2} name="Percentage" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Subject Performance */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Subject-wise Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={subjectStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subject" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="averagePercentage" fill="#2563eb" name="Average %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Test History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Test History</h2>
        {recentHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No tests attempted yet</p>
        ) : (
          <div className="space-y-3">
            {recentHistory.map((test, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800">{test.testName}</div>
                  <div className="text-sm text-gray-500">{new Date(test.date).toLocaleDateString()}</div>
                </div>
                <div className="text-xl font-bold text-blue-600">{test.percentage}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/student" className="block text-center text-blue-600 hover:underline">
        ← Back to Dashboard
      </Link>
    </div>
  );
}
