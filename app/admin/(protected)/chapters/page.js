"use client";
import { useState, useEffect } from "react";

export default function ChaptersPage() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subjectId: "", name: "", description: "" });
  const [filterSubject, setFilterSubject] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSubjects = async () => {
    const res = await fetch("/api/admin/subjects");
    const data = await res.json();
    if (data.success) setSubjects(data.data.filter(s => s.isActive));
  };

  const fetchChapters = async () => {
    setLoading(true);
    const q = filterSubject ? `?subjectId=${filterSubject}` : "";
    const res = await fetch(`/api/admin/chapters${q}`);
    const data = await res.json();
    if (data.success) setChapters(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchSubjects(); }, []);
  useEffect(() => { fetchChapters(); }, [filterSubject]);

  const resetForm = () => { setForm({ subjectId: "", name: "", description: "" }); setEditingId(null); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    const url = editingId ? `/api/admin/chapters/${editingId}` : "/api/admin/chapters";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setSuccess(editingId ? "Chapter updated." : "Chapter created."); resetForm(); fetchChapters(); }
    else setError(data.message);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this chapter?")) return;
    const res = await fetch(`/api/admin/chapters/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { setSuccess("Chapter deleted."); fetchChapters(); }
    else setError(data.message);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Chapter Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">{editingId ? "Edit Chapter" : "Add New Chapter"}</h2>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">{success}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select required value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" disabled={!!editingId}>
            <option value="">Select Subject *</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Chapter Name *" className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          <div className="md:col-span-3 flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update" : "Add Chapter"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">All Chapters</h2>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div> :
          chapters.length === 0 ? <div className="p-8 text-center text-gray-500">No chapters found.</div> : (
            <div className="divide-y divide-gray-100">
              {chapters.map(c => (
                <div key={c._id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-sm text-gray-500">{c.subjectId?.name || "Unknown Subject"} {c.description && `• ${c.description}`}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setForm({ subjectId: c.subjectId?._id || "", name: c.name, description: c.description || "" }); setEditingId(c._id); setError(""); setSuccess(""); }} className="text-blue-600 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition">Edit</button>
                    <button onClick={() => handleDelete(c._id)} className="text-red-600 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
