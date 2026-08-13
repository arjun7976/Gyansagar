"use client";
import { useState, useEffect } from "react";

export default function AdminNotificationsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  
  // Filters
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        type,
        channel,
        status
      });
      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setTotal(data.pagination.total);
        setPages(data.pagination.pages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, type, channel, status]);

  const handleRetry = async (id) => {
    try {
      const res = await fetch(`/api/admin/notifications/${id}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Notification sent successfully");
        fetchLogs();
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to retry notification");
    }
  };

  const statusColor = {
    pending: "bg-yellow-100 text-yellow-700",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700"
  };

  const channelIcon = {
    email: "📧",
    whatsapp: "📱"
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Notification Logs</h1>
        <p className="text-gray-500 mt-1">View and manage notification delivery status</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <select 
            value={type} 
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="welcome">Welcome</option>
            <option value="result">Result</option>
            <option value="certificate">Certificate</option>
          </select>
          <select 
            value={channel} 
            onChange={(e) => { setChannel(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Channel</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sent At</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Error</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-12 text-gray-500 font-medium">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-gray-500 font-medium">No notification logs found</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{log.userId?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{log.userId?.email}</div>
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-700">{log.type}</td>
                    <td className="px-6 py-4">
                      <span className="text-xl">{channelIcon[log.channel] || "📨"}</span>
                      <span className="ml-2 capitalize text-gray-700">{log.channel}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.recipient}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusColor[log.status] || "bg-gray-100 text-gray-700"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                      {log.errorMessage || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {log.status === "failed" && (
                        <button 
                          onClick={() => handleRetry(log._id)}
                          className="text-blue-600 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition"
                        >
                          Retry
                        </button>
                      )}
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
