"use client";
import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";

export default function TestBuilderPage({ params }) {
  const { id: testId } = use(params); // Changed to use `id` since the path will now be `[id]`
  const [test, setTest] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [bankPage, setBankPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [bankFilters, setBankFilters] = useState({ search: "", subjectId: "", chapterId: "", difficulty: "", status: "active" });
  const [loading, setLoading] = useState(true);
  const [bankLoading, setBankLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const fetchTest = async () => {
    const res = await fetch(`/api/admin/tests/${testId}`);
    const d = await res.json();
    if (d.success) setTest(d.data);
  };

  const fetchTestQuestions = async () => {
    const res = await fetch(`/api/admin/tests/${testId}/questions`);
    const d = await res.json();
    if (d.success) setTestQuestions(d.data);
  };

  const fetchBankQuestions = useCallback(async () => {
    setBankLoading(true);
    const params = new URLSearchParams({ page: bankPage.toString(), limit: "15", ...Object.fromEntries(Object.entries(bankFilters).filter(([, v]) => v)) });
    const res = await fetch(`/api/admin/question-bank?${params.toString()}`);
    const d = await res.json();
    if (d.success) { setBankQuestions(d.data); setPagination(d.pagination); }
    setBankLoading(false);
  }, [bankPage, bankFilters]);

  const fetchSubjects = async () => {
    const res = await fetch("/api/admin/subjects?active=true");
    const d = await res.json();
    if (d.success) setSubjects(d.data);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTest(), fetchTestQuestions(), fetchSubjects()]).finally(() => setLoading(false));
  }, [testId]);

  useEffect(() => { fetchBankQuestions(); }, [fetchBankQuestions]);

  const handleFilterChange = (key, value) => {
    const updated = { ...bankFilters, [key]: value };
    if (key === "subjectId") { updated.chapterId = ""; if (value) { fetch(`/api/admin/chapters?subjectId=${value}&active=true`).then(r => r.json()).then(d => { if (d.success) setChapters(d.data); }); } else { setChapters([]); } }
    setBankFilters(updated);
    setBankPage(1);
  };

  const addedIds = new Set(testQuestions.map(tq => tq.questionId?._id?.toString() || tq.questionId?.toString()));

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleAddSelected = async () => {
    const toAdd = [...selected].filter(id => !addedIds.has(id));
    if (!toAdd.length) { setMsg({ type: "error", text: "All selected questions are already in this test." }); return; }
    const res = await fetch(`/api/admin/tests/${testId}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionIds: toAdd }) });
    const d = await res.json();
    if (d.success) { setMsg({ type: "success", text: d.message }); setSelected(new Set()); fetchTestQuestions(); }
    else setMsg({ type: "error", text: d.message });
  };

  const handleRemoveFromTest = async (questionId) => {
    const res = await fetch(`/api/admin/tests/${testId}/questions/${questionId}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) { setMsg({ type: "success", text: "Question removed." }); fetchTestQuestions(); }
    else setMsg({ type: "error", text: d.message });
  };

  const handleValidate = async () => {
    setValidating(true); setValidationResult(null);
    const res = await fetch(`/api/admin/tests/${testId}/validate`);
    const d = await res.json();
    setValidationResult(d);
    setValidating(false);
  };

  const handlePublish = async () => {
    const val = await fetch(`/api/admin/tests/${testId}/validate`).then(r => r.json());
    if (!val.canPublish) { setValidationResult(val); setMsg({ type: "error", text: "Cannot publish. See validation errors below." }); return; }
    const res = await fetch(`/api/admin/tests/${testId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "published" }) });
    const d = await res.json();
    if (d.success) { setMsg({ type: "success", text: "Test published successfully!" }); fetchTest(); }
    else setMsg({ type: "error", text: d.message });
  };

  const difficultyColor = { Easy: "bg-green-100 text-green-700", Medium: "bg-yellow-100 text-yellow-700", Hard: "bg-red-100 text-red-700" };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading test builder...</div>;
  if (!test) return <div className="p-8 text-center text-red-500">Test not found.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/admin/tests" className="text-blue-500 text-sm hover:underline mb-1 block">← Back to Tests</Link>
          <h1 className="text-2xl font-bold text-gray-800">{test.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{test.subject} · {test.duration} min · {test.totalMarks} marks · <span className={`font-semibold ${test.status === "published" ? "text-green-600" : "text-yellow-600"}`}>{test.status}</span></p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={handleValidate} disabled={validating} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition text-sm disabled:opacity-50">{validating ? "Checking..." : "Validate"}</button>
          {test.status !== "published" && <button onClick={handlePublish} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition text-sm">Publish Test</button>}
        </div>
      </div>

      {msg.text && (
        <div className={`p-3 rounded-lg border text-sm flex justify-between ${msg.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg({ type: "", text: "" })} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {validationResult && (
        <div className={`p-4 rounded-lg border text-sm ${validationResult.canPublish ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {validationResult.canPublish ? (
            <p className="font-semibold">✓ Test is ready to publish!</p>
          ) : (
            <>
              <p className="font-bold mb-2">Cannot publish test. Please fix these issues:</p>
              <ul className="list-disc list-inside space-y-1">{validationResult.errors?.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Test Questions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Questions in Test <span className="text-gray-400 font-normal">({testQuestions.length})</span></h2>
          </div>
          {testQuestions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No questions added yet. Select from the bank →</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {testQuestions.map((tq, idx) => {
                const q = tq.questionId;
                return (
                  <div key={tq._id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                    <span className="text-gray-400 text-sm font-mono w-5 shrink-0 pt-0.5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-2">{q?.questionText || "Unknown"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${difficultyColor[q?.difficulty] || "bg-gray-100 text-gray-500"}`}>{q?.difficulty}</span>
                        <span className="text-xs text-gray-400">{q?.marks} marks</span>
                        <span className="text-xs text-gray-400">{q?.subjectId?.name || q?.subject || ""}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveFromTest(q?._id)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 transition shrink-0">Remove</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Question Bank Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800">Question Bank</h2>
              {selected.size > 0 && (
                <button onClick={handleAddSelected} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                  Add {selected.size} Selected →
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={bankFilters.search} onChange={e => handleFilterChange("search", e.target.value)} placeholder="Search..." className="col-span-2 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <select value={bankFilters.subjectId} onChange={e => handleFilterChange("subjectId", e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <select value={bankFilters.difficulty} onChange={e => handleFilterChange("difficulty", e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
          {bankLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 max-h-[50vh] overflow-y-auto">
                {bankQuestions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No questions found.</div>
                ) : bankQuestions.map(q => {
                  const isAdded = addedIds.has(q._id.toString());
                  const isSelected = selected.has(q._id.toString());
                  return (
                    <div key={q._id} onClick={() => !isAdded && toggleSelect(q._id.toString())} className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition ${isAdded ? "opacity-50 cursor-not-allowed bg-gray-50" : isSelected ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"}`}>
                      <input type="checkbox" checked={isSelected} disabled={isAdded} readOnly className="mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 line-clamp-2">{q.questionText}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${difficultyColor[q.difficulty] || "bg-gray-100"}`}>{q.difficulty}</span>
                          <span className="text-xs text-gray-400">{q.marks} marks</span>
                          {isAdded && <span className="text-xs text-green-600 font-medium">✓ Already in test</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pagination.pages > 1 && (
                <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center text-sm">
                  <button disabled={bankPage <= 1} onClick={() => setBankPage(p => p - 1)} className="px-2 py-1 border rounded hover:bg-white disabled:opacity-50">←</button>
                  <span className="text-gray-500">{bankPage} / {pagination.pages}</span>
                  <button disabled={bankPage >= pagination.pages} onClick={() => setBankPage(p => p + 1)} className="px-2 py-1 border rounded hover:bg-white disabled:opacity-50">→</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
