"use client";

import { useState, useEffect } from "react";

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

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

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">🥇 Rank 1</span>;
    if (rank === 2) return <span className="bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">🥈 Rank 2</span>;
    if (rank === 3) return <span className="bg-orange-100 text-orange-800 border border-orange-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">🥉 Rank 3</span>;
    return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">Rank {rank}</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Issued Certificates</h1>
        <p className="text-gray-500 mt-1">View the top rankers (1st, 2nd, 3rd) who received automated certificates.</p>
      </div>

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
                      <div className="font-medium text-gray-800">{cert.testId?.title || "Unknown Test"}</div>
                      <div className="text-xs text-blue-600 font-semibold">{cert.testId?.subject || "Subject"}</div>
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
