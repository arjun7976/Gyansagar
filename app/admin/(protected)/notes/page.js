"use client";

import { useState, useEffect } from "react";

const emptyForm = { title: "", subject: "", content: "", fileUrl: "", isActive: true };

export default function AdminNotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadNotes(); }, []);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notes");
      const data = await res.json();
      if (data.success) {
        setNotes(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (note) => {
    setIsEditing(true);
    setCurrentId(note._id);
    setForm({
      title: note.title,
      subject: note.subject,
      content: note.content,
      fileUrl: note.fileUrl,
      isActive: note.isActive
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentId(null);
    setForm({ ...emptyForm });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = isEditing ? `/api/admin/notes/${currentId}` : "/api/admin/notes";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (data.success) {
        handleCancel();
        loadNotes();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const res = await fetch(`/api/admin/notes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadNotes();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to delete note");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Study Notes</h1>
        <p className="mt-2 text-slate-600">Upload and manage study material for your students.</p>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-xl font-semibold mb-4">{isEditing ? "Edit Note" : "Add New Note"}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full p-2 border rounded-lg" placeholder="e.g. Chapter 1 Geometry" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required className="w-full p-2 border rounded-lg" placeholder="e.g. Mathematics" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File URL (PDF/Drive Link)</label>
              <input type="url" value={form.fileUrl} onChange={e => setForm({...form, fileUrl: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content / Description</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full p-2 border rounded-lg h-32" placeholder="Text notes..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
              <label htmlFor="isActive" className="text-sm font-medium">Visible to students</label>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-800 disabled:opacity-50">
                {saving ? "Saving..." : "Save Note"}
              </button>
              {isEditing && (
                <button type="button" onClick={handleCancel} className="bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-200">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No study notes uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 font-semibold text-slate-600">Subject</th>
                    <th className="p-4 font-semibold text-slate-600">Title</th>
                    <th className="p-4 font-semibold text-slate-600">Status</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notes.map(note => (
                    <tr key={note._id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-blue-900">{note.subject}</td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">{note.title}</p>
                        {note.fileUrl && <a href={note.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View File</a>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${note.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                          {note.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-3">
                        <button onClick={() => handleEdit(note)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => handleDelete(note._id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
