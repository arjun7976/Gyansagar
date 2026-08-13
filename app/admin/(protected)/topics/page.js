"use client";
import { useState, useEffect } from "react";

export default function TopicsPage() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subjectId: "", chapterId: "", name: "", description: "" });
  const [filterSubject, setFilterSubject] = useState("");
  const [filterChapter, setFilterChapter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSubjects = async () => {
    const res = await fetch("/api/admin/subjects?active=true");
    const data = await res.json();
    if (data.success) setSubjects(data.data);
  };

  const fetchChapters = async (subjectId) => {
    if (!subjectId) { setChapters([]); return; }
    const res = await fetch(`/api/admin/chapters?subjectId=${subjectId}&active=true`);
    const data = await res.json();
    if (data.success) setChapters(data.data);
  };

  const fetchTopics = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSubject) params.set("subjectId", filterSubject);
    if (filterChapter) params.set("chapterId", filterChapter);
    const res = await fetch(`/api/admin/topics?${params.toString()}`);
    const data = await res.json();
    if (data.success) setTopics(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchSubjects(); }, []);
  useEffect(() => { fetchTopics(); }, [filterSubject, filterChapter]);

  const handleFormSubjectChange = (e) => {
    const sid = e.target.value;
    setForm(f => ({ ...f, subjectId: sid, chapterId: "" }));
    fetchChapters(sid);
  };

  const handleFilterSubjectChange = (e) => {
    const sid = e.target.value;
    setFilterSubject(sid);
    setFilterChapter("");
    if (sid) fetchChapters(sid);
    else setChapters([]);
  };

  const resetForm = () => { setForm({ subjectId: "", chapterId: "", name: "", description: "" }); setEditingId(null); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    const url = editingId ? `/api/admin/topics/${editingId}` : "/api/admin/topics";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setSuccess(editingId ? "Topic updated." : "Topic created."); resetForm(); fetchTopics(); }
    else setError(data.message);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this topic?")) return;
    const res = await fetch(`/api/admin/topics/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { setSuccess("Topic deleted."); fetchTopics(); }
    else setError(data.message);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Topic Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">{editingId ? "Edit Topic" : "Add New Topic"}</h2>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">{success}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select required value={form.subjectId} onChange={handleFormSubjectChange} className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" disabled={!!editingId}>
            <option value="">Select Subject *</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select required value={form.chapterId} onChange={e => setForm(f => ({ ...f, chapterId: e.target.value }))} className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" disabled={!form.subjectId || !!editingId}>
            <option value="">Select Chapter *</option>
            {chapters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Topic Name *" className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update" : "Add Topic"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-700">All Topics</h2>
          <div className="flex gap-3">
            <select value={filterSubject} onChange={handleFilterSubjectChange} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select value={filterChapter} onChange={e => setFilterChapter(e.target.value)} disabled={!filterSubject} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
              <option value="">All Chapters</option>
              {chapters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div> :
          topics.length === 0 ? <div className="p-8 text-center text-gray-500">No topics found.</div> : (
            <div className="divide-y divide-gray-100">
              {topics.map(t => (
                <div key={t._id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.subjectId?.name} → {t.chapterId?.name}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setForm({ subjectId: t.subjectId?._id || "", chapterId: t.chapterId?._id || "", name: t.name, description: t.description || "" }); setEditingId(t._id); setError(""); setSuccess(""); fetchChapters(t.subjectId?._id); }} className="text-blue-600 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition">Edit</button>
                    <button onClick={() => handleDelete(t._id)} className="text-red-600 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
