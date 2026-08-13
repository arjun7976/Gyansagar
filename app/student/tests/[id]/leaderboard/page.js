"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Link from "next/link";

export default function LeaderboardPage({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/student/tests/${id}/leaderboard?filter=${filter}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLeaderboard(data.leaderboard);
        } else {
          setError(data.message || "Failed to load leaderboard.");
        }
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [id, filter]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Leaderboard</h1>
          <p className="text-gray-500 mt-1">See how you rank against other students.</p>
        </div>
        <Link 
          href="/student"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-2 items-center justify-between">
          <h2 className="font-semibold text-gray-700">Top Performers</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter("passed")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'passed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Passed
            </button>
            <button 
              onClick={() => setFilter("failed")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Failed
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Loading leaderboard...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 font-medium">{error}</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium">No results found for the selected filter. Leaderboard will appear after students submit the test.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase tracking-wider text-right">Score</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase tracking-wider text-right">%</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase tracking-wider text-right">Accuracy</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase tracking-wider text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaderboard.map((entry, idx) => {
                  let rankClass = "text-gray-700 bg-gray-50 border-gray-200";
                  if (entry.rank === 1) rankClass = "text-yellow-700 bg-yellow-100 border-yellow-300 shadow-sm";
                  else if (entry.rank === 2) rankClass = "text-gray-600 bg-gray-200 border-gray-300 shadow-sm";
                  else if (entry.rank === 3) rankClass = "text-orange-800 bg-orange-100 border-orange-300 shadow-sm";
                  
                  return (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border font-bold text-sm ${rankClass}`}>
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{entry.studentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-800">
                        {entry.score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-600">
                        {entry.percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-blue-600">
                        {entry.accuracy}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-purple-600">
                        {formatTime(entry.timeTakenSeconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
