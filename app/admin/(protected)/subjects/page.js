"use client";
import { useState, useEffect } from "react";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", code: "" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSubjects = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/subjects");
    const data = await res.json();
    if (data.success) setSubjects(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchSubjects(); }, []);

  const resetForm = () => { setForm({ name: "", description: "", code: "" }); setEditingId(null); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    const url = editingId ? `/api/admin/subjects/${editingId}` : "/api/admin/subjects";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setSuccess(editingId ? "Subject updated." : "Subject created."); resetForm(); fetchSubjects(); }
    else setError(data.message);
    setSaving(false);
  };

  const handleToggle = async (id, isActive) => {
    await fetch(`/api/admin/subjects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) });
    fetchSubjects();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this subject? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/subjects/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { setSuccess("Subject deleted."); fetchSubjects(); }
    else setError(data.message);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Subject Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage subjects for the Question Bank.</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">{editingId ? "Edit Subject" : "Add New Subject"}</h2>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">{success}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Subject Name *" className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Code (e.g. COMP)" className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          <div className="md:col-span-3 flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update Subject" : "Add Subject"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition">Cancel</button>}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-700">All Subjects ({subjects.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No subjects yet. Create one above.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {subjects.map(s => (
              <div key={s._id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{s.name} {s.code && <span className="text-xs text-gray-400 ml-1">({s.code})</span>}</div>
                    {s.description && <div className="text-sm text-gray-500">{s.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                  <button onClick={() => { setForm({ name: s.name, code: s.code || "", description: s.description || "" }); setEditingId(s._id); setError(""); setSuccess(""); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition">Edit</button>
                  <button onClick={() => handleToggle(s._id, s.isActive)} className="text-yellow-600 hover:text-yellow-800 text-sm font-medium px-3 py-1 rounded hover:bg-yellow-50 transition">{s.isActive ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => handleDelete(s._id)} className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
