"use client";

import { useEffect, useState } from "react";

export default function StudentNotesPage() {
  const [groupedNotes, setGroupedNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    try {
      const res = await fetch("/api/student/notes");
      const data = await res.json();
      if (data.success) {
        setGroupedNotes(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-medium">Loading study materials...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto">{error}</div>;
  }

  const subjects = Object.keys(groupedNotes);

  if (subjects.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center max-w-4xl mx-auto">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          📚
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Study Notes Yet</h2>
        <p className="text-slate-500">Your teachers haven't uploaded any study material yet. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Study Notes</h1>
        <p className="mt-2 text-slate-600 text-lg">Browse study materials uploaded by your teachers, categorized by subject.</p>
      </div>

      <div className="space-y-8">
        {subjects.map(subject => (
          <div key={subject} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-blue-800 text-white p-4">
              <h2 className="text-xl font-bold">{subject}</h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              {groupedNotes[subject].map(note => (
                <div key={note._id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">{note.title}</h3>
                      {note.content && (
                        <p className="mt-2 text-slate-600 whitespace-pre-wrap">{note.content}</p>
                      )}
                      <p className="mt-3 text-xs font-semibold text-slate-400">
                        Uploaded on {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {note.fileUrl && (
                      <a 
                        href={note.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm"
                      >
                        📄 View File
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
