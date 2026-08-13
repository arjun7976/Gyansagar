"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

export default function AdminResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  
  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [passFail, setPassFail] = useState("");
  const [sort, setSort] = useState("latest");

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        passFail,
        sort
      });
      const res = await fetch(`/api/admin/results?${q.toString()}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        setTotal(data.pagination.total);
        setPages(data.pagination.pages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, passFail, sort]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchResults();
  };

  const formatTime = (seconds) => {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleExport = async (type) => {
    const params = new URLSearchParams({
      testId: "",
      studentId: "",
      status: "",
      passFail,
      startDate: "",
      endDate: ""
    });

    const url = `/api/admin/results/export${type === "csv" ? "/csv" : ""}?${params.toString()}`;
    
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `results EXPORT.${type === "csv" ? "csv" : "xlsx"}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error("Export failed:", e);
      alert("Failed to export results");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Test Results</h1>
          <p className="text-gray-500 mt-1">Manage and view student test submissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport("excel")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Export Excel
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Search student name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select 
            value={passFail} 
            onChange={(e) => { setPassFail(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Results</option>
            <option value="passed">Passed Only</option>
            <option value="failed">Failed Only</option>
          </select>
          <select 
            value={sort} 
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highestScore">Highest Score</option>
            <option value="lowestScore">Lowest Score</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
            Filter
          </button>
        </form>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Test</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Score</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">%</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Result</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12 text-gray-500 font-medium">Loading results...</td></tr>
              ) : results.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-gray-500 font-medium">No results found</td></tr>
              ) : (
                results.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{r.studentId?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{r.studentId?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{r.testId?.title || "Unknown Test"}</div>
                      <div className="text-xs text-gray-500">Total Marks: {r.testId?.totalMarks}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800">{r.score}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600">{r.percentage}%</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">
              Showing page <span className="font-semibold text-gray-700">{page}</span> of <span className="font-semibold text-gray-700">{pages}</span>
            </span>
            <div className="flex space-x-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button 
                disabled={page === pages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
