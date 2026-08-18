"use client";

import { useState, useEffect } from "react";

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  
  // Monthly modal state
  const [showModal, setShowModal] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/certificates?page=${page}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setCertificates(data.certificates);
        setPages(data.pagination.pages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [page]);
  
  const handleGenerateMonthly = async () => {
    setGenerating(true);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthYear = `${monthNames[month - 1]} ${year}`;
    
    try {
      const res = await fetch("/api/admin/certificates/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, monthYear })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setShowModal(false);
        setPage(1);
        fetchCertificates();
      }
    } catch (e) {
      alert("Failed to generate certificates.");
    } finally {
      setGenerating(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">🥇 Rank 1</span>;
    if (rank === 2) return <span className="bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">🥈 Rank 2</span>;
    if (rank === 3) return <span className="bg-orange-100 text-orange-800 border border-orange-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">🥉 Rank 3</span>;
    return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">Rank {rank}</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Issued Certificates</h1>
          <p className="text-gray-500 mt-1">View the top rankers (1st, 2nd, 3rd) who received automated certificates.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition"
        >
          🏆 Generate Monthly Champions
        </button>
      </div>
      
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-96">
            <h2 className="text-xl font-bold mb-4">Generate Monthly Certificates</h2>
            <p className="text-sm text-gray-600 mb-4">
              This will analyze all tests submitted in the selected month, find the Top 3 highest scoring students, and issue them the prestigious Monthly Champion certificates.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Month</label>
                <select value={month} onChange={e => setMonth(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
              <button onClick={handleGenerateMonthly} disabled={generating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                {generating ? "Generating..." : "Generate Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Test & Subject</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Rank</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Score %</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Certificate ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Issued Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12 text-gray-500 font-medium">Loading certificates...</td></tr>
              ) : certificates.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-gray-500 font-medium">No certificates have been issued yet.</td></tr>
              ) : (
                certificates.map(cert => (
                  <tr key={cert._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{cert.studentId?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{cert.studentId?.batch || "No Batch"}</div>
                    </td>
                    <td className="px-6 py-4">
                      {cert.type === "monthly" ? (
                        <div>
                          <div className="font-bold text-indigo-700 uppercase tracking-wide">🏆 Monthly Champion</div>
                          <div className="text-xs text-gray-500 font-medium">{cert.monthYear}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-800">{cert.testId?.title || "Unknown Test"}</div>
                          <div className="text-xs text-blue-600 font-semibold">{cert.testId?.subject || "Subject"}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getRankBadge(cert.rank)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">
                      {cert.percentage}%
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono border border-gray-200">
                        {cert.certificateId}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(cert.issuedAt).toLocaleDateString()}
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
