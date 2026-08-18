"use client";

import { useState, useEffect } from "react";

export default function AdminDoubtsPage() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null); // ID of doubt
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDoubts();
  }, []);

  const fetchDoubts = async () => {
    try {
      const res = await fetch("/api/admin/doubts");
      const data = await res.json();
      if (data.success) {
        setDoubts(data.doubts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitReply = async (id) => {
    if (!replyText.trim()) return;
    setSaving(true);
    
    try {
      const res = await fetch(`/api/admin/doubts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: replyText })
      });
      const data = await res.json();
      
      if (data.success) {
        setReplyingTo(null);
        setReplyText("");
        fetchDoubts();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  };

  const filteredDoubts = doubts.filter(d => filter === "All" || d.status === filter);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Doubt Clearance</h1>
          <p className="text-gray-500 text-sm mt-1">Reply to student questions and doubts.</p>
        </div>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="All">All Doubts</option>
          <option value="Pending">Pending Doubts</option>
          <option value="Resolved">Resolved Doubts</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading doubts...</div>
      ) : filteredDoubts.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border text-center text-gray-500">
          No {filter.toLowerCase()} doubts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredDoubts.map(d => (
            <div key={d._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
              
              {/* Left Side: Question Info */}
              <div className="p-6 flex-1 bg-gray-50 border-r border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-bold text-gray-900 block">{d.studentId?.name || "Unknown Student"}</span>
                    <span className="text-xs text-gray-500">{d.studentId?.batch || "No Batch"} • {d.studentId?.mobile}</span>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${d.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {d.status}
                  </span>
                </div>
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mb-3">{d.subject}</div>
                <p className="text-gray-800 font-medium whitespace-pre-wrap">{d.question}</p>
                <div className="text-xs text-gray-400 mt-4">{new Date(d.createdAt).toLocaleString()}</div>
              </div>

              {/* Right Side: Admin Reply */}
              <div className="p-6 flex-1 bg-white">
                {d.status === "Resolved" ? (
                  <div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Teacher's Reply</p>
                    <p className="text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">{d.adminReply}</p>
                    <div className="mt-4 text-right">
                      <button 
                        onClick={() => { setReplyingTo(d._id); setReplyText(d.adminReply); }}
                        className="text-sm text-blue-600 font-medium hover:underline"
                      >
                        Edit Reply
                      </button>
                    </div>
                  </div>
                ) : replyingTo === d._id ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Write Reply</p>
                    <textarea 
                      rows="4" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your explanation here..."
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    ></textarea>
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => setReplyingTo(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button 
                        onClick={() => submitReply(d._id)} 
                        disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Send Reply"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-center p-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-2xl text-gray-400">?</div>
                    <p className="text-gray-500 mb-4">No reply has been sent yet.</p>
                    <button 
                      onClick={() => { setReplyingTo(d._id); setReplyText(""); }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                    >
                      Write Reply
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
