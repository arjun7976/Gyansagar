"use client";

import { useState, useEffect } from "react";

export default function StudentDoubtsPage() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("General");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchDoubts();
  }, []);

  const fetchDoubts = async () => {
    try {
      const res = await fetch("/api/student/doubts");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/student/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, question })
      });
      const data = await res.json();
      if (data.success) {
        setQuestion("");
        setMessage("Doubt submitted successfully!");
        fetchDoubts();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(data.message || "Failed to submit doubt");
      }
    } catch (e) {
      setMessage("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <h1 className="text-3xl font-bold font-heading mb-2 relative z-10">Ask a Doubt</h1>
        <p className="text-blue-100 relative z-10">Stuck on a problem? Ask your teachers for help!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            <h2 className="font-bold text-xl text-gray-800">New Doubt</h2>
            
            {message && (
              <div className={`p-3 rounded-xl text-sm font-medium ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {message}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="General">General</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Question</label>
              <textarea 
                rows="4" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question here in detail..."
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all disabled:opacity-70"
            >
              {submitting ? "Submitting..." : "Send to Teachers"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-xl text-gray-800 mb-4">My Previous Doubts</h2>
          
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : doubts.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center text-gray-500">
              You haven't asked any doubts yet.
            </div>
          ) : (
            doubts.map(d => (
              <div key={d._id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{d.subject}</span>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${d.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {d.status}
                  </span>
                </div>
                <p className="text-gray-800 font-medium mb-4 whitespace-pre-wrap">{d.question}</p>
                
                {d.status === 'Resolved' ? (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mt-4">
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Teacher's Reply</p>
                    <p className="text-gray-800 whitespace-pre-wrap text-sm">{d.adminReply}</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 mt-4 italic">Waiting for teacher's reply...</div>
                )}
                <div className="text-xs text-gray-400 mt-4 text-right">
                  {new Date(d.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
