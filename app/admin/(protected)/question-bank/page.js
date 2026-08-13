"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const [filters, setFilters] = useState({ search: "", subjectId: "", chapterId: "", topicId: "", difficulty: "", status: "active" });
  const [page, setPage] = useState(1);

  const fetchSubjects = async () => {
    const res = await fetch("/api/admin/subjects");
    const d = await res.json();
    if (d.success) setSubjects(d.data);
  };

  const fetchChapters = async (subjectId) => {
    if (!subjectId) { setChapters([]); setTopics([]); return; }
    const res = await fetch(`/api/admin/chapters?subjectId=${subjectId}`);
    const d = await res.json();
    if (d.success) setChapters(d.data);
  };

  const fetchTopics = async (chapterId) => {
    if (!chapterId) { setTopics([]); return; }
    const res = await fetch(`/api/admin/topics?chapterId=${chapterId}`);
    const d = await res.json();
    if (d.success) setTopics(d.data);
  };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20", ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    const res = await fetch(`/api/admin/question-bank?${params.toString()}`);
    const d = await res.json();
    if (d.success) { setQuestions(d.data); setPagination(d.pagination); }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { fetchSubjects(); }, []);
  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    if (key === "subjectId") { updated.chapterId = ""; updated.topicId = ""; fetchChapters(value); setTopics([]); }
    if (key === "chapterId") { updated.topicId = ""; fetchTopics(value); }
    setFilters(updated);
    setPage(1);
  };

  const openPreview = async (id) => {
    setPreviewLoading(true);
    setPreview({ loading: true });
    const res = await fetch(`/api/admin/question-bank/${id}`);
    const d = await res.json();
    if (d.success) setPreview(d.data);
    setPreviewLoading(false);
  };

  const handleArchive = async (id) => {
    const res = await fetch(`/api/admin/question-bank/${id}/archive`, { method: "PATCH" });
    const d = await res.json();
    if (d.success) { setActionMsg("Question archived."); fetchQuestions(); setPreview(null); }
    else setActionMsg(d.message);
  };

  const handleDuplicate = async (id) => {
    const res = await fetch(`/api/admin/question-bank/${id}/duplicate`, { method: "POST" });
    const d = await res.json();
    if (d.success) { setActionMsg("Question duplicated successfully."); fetchQuestions(); setPreview(null); }
    else setActionMsg(d.message);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this question? If it's used in tests, it will be archived instead.")) return;
    const res = await fetch(`/api/admin/question-bank/${id}`, { method: "DELETE" });
    const d = await res.json();
    setActionMsg(d.message);
    fetchQuestions();
    setPreview(null);
  };

  const handleBulkDelete = async () => {
    if (!confirm("WARNING: This will permanently delete ALL questions in the database and remove them from all tests! This action cannot be undone. Are you absolutely sure you want to proceed?")) return;
    
    // Extra safety confirmation
    const text = prompt("Type 'DELETE ALL' to confirm:");
    if (text !== "DELETE ALL") {
      alert("Bulk delete cancelled.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/questions/bulk-delete", { method: "DELETE" });
      const d = await res.json();
      if (d.success) {
        setActionMsg(d.message);
        fetchQuestions();
      } else {
        setActionMsg(d.message || "Failed to delete questions.");
        setLoading(false);
      }
    } catch (e) {
      setActionMsg("An error occurred during bulk deletion.");
      setLoading(false);
    }
  };

  const difficultyColor = { Easy: "bg-green-100 text-green-700", Medium: "bg-yellow-100 text-yellow-700", Hard: "bg-red-100 text-red-700" };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Question Bank</h1>
          <p className="text-gray-500 text-sm mt-1">Central repository of all questions — reusable across multiple tests.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={handleBulkDelete} className="border border-red-600 text-red-600 bg-white px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition text-sm">Delete All Questions</button>
          <Link href="/admin/questions/import" className="border border-blue-600 text-blue-600 bg-white px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition text-sm">Import Excel/CSV</Link>
          <Link href="/admin/questions/create" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Create Question</Link>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm flex justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg("")} className="text-blue-400 hover:text-blue-600">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input value={filters.search} onChange={e => handleFilterChange("search", e.target.value)} placeholder="Search questions..." className="col-span-2 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <select value={filters.subjectId} onChange={e => handleFilterChange("subjectId", e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={filters.chapterId} onChange={e => handleFilterChange("chapterId", e.target.value)} disabled={!filters.subjectId} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50">
            <option value="">All Chapters</option>
            {chapters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={filters.difficulty} onChange={e => handleFilterChange("difficulty", e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.status} onChange={e => handleFilterChange("status", e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>{pagination.total} questions found</span>
          <span>Page {pagination.page} / {pagination.pages}</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No questions found. <Link href="/admin/questions/create" className="text-blue-600 hover:underline">Create one</Link></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Question</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Difficulty</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Marks</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Used In</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {questions.map(q => (
                  <tr key={q._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-sm font-medium text-gray-900 line-clamp-2">{q.questionText}</div>
                      {q.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{q.tags.slice(0, 3).map(t => <span key={t} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">{t}</span>)}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{q.subjectId?.name || q.subject || "—"}</div>
                      {q.chapterId && <div className="text-xs text-gray-400">{q.chapterId.name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${difficultyColor[q.difficulty] || "bg-gray-100 text-gray-600"}`}>{q.difficulty}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{q.marks}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded">{q.usedInTests} tests</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${q.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{q.isActive ? "Active" : "Archived"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openPreview(q._id)} className="text-blue-600 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition">View</button>
                        <Link href={`/admin/questions/${q._id}/edit`} className="text-gray-600 text-xs font-medium px-2 py-1 rounded hover:bg-gray-100 transition">Edit</Link>
                        <button onClick={() => handleDuplicate(q._id)} className="text-green-600 text-xs font-medium px-2 py-1 rounded hover:bg-green-50 transition">Copy</button>
                        {q.isActive && <button onClick={() => handleArchive(q._id)} className="text-yellow-600 text-xs font-medium px-2 py-1 rounded hover:bg-yellow-50 transition">Archive</button>}
                        <button onClick={() => handleDelete(q._id)} className="text-red-600 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Question Preview</h2>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            {previewLoading || preview.loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${difficultyColor[preview.difficulty]}`}>{preview.difficulty}</span>
                    <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">{preview.marks} marks</span>
                    {!preview.isActive && <span className="px-2 py-1 rounded text-xs font-bold bg-gray-200 text-gray-600">Archived</span>}
                  </div>
                  <p className="text-gray-900 font-medium text-base whitespace-pre-wrap">{preview.questionText}</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {["A", "B", "C", "D"].map(opt => (
                    <div key={opt} className={`p-3 rounded-lg border text-sm font-medium ${opt === preview.correctAnswer ? "bg-green-50 border-green-400 text-green-800" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
                      <span className="font-bold mr-2">{opt}.</span> {preview.options?.[opt]}
                      {opt === preview.correctAnswer && <span className="ml-2 text-xs text-green-600 font-bold">✓ Correct</span>}
                    </div>
                  ))}
                </div>
                {preview.explanation && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                    <strong>Explanation:</strong> {preview.explanation}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 text-sm text-gray-600">
                  <div><span className="font-semibold">Subject:</span><br />{preview.subjectId?.name || preview.subject || "—"}</div>
                  <div><span className="font-semibold">Chapter:</span><br />{preview.chapterId?.name || "—"}</div>
                  <div><span className="font-semibold">Topic:</span><br />{preview.topicId?.name || "—"}</div>
                </div>
                {preview.usage?.length > 0 && (
                  <div className="text-sm">
                    <p className="font-semibold text-gray-700 mb-2">Used in {preview.usage.length} test(s):</p>
                    <ul className="space-y-1">
                      {preview.usage.map(u => (
                        <li key={u._id} className="flex items-center gap-2 text-gray-600">
                          <span className="w-2 h-2 bg-purple-400 rounded-full inline-block"></span>
                          {u.testId?.title || "Unknown Test"}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${u.testId?.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{u.testId?.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-3 pt-2 border-t">
                  <button onClick={() => handleDuplicate(preview._id)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">Duplicate</button>
                  {preview.isActive && <button onClick={() => handleArchive(preview._id)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition">Archive</button>}
                  <button onClick={() => handleDelete(preview._id)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
