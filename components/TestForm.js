"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const defaults = { 
  title: "", 
  subject: "", 
  description: "", 
  instructions: "", 
  duration: 30, 
  totalMarks: 100, 
  negativeMarks: 0, 
  passingPercentage: 40, 
  shuffleQuestions: true, 
  shuffleOptions: false, 
  showResultImmediately: true, 
  maxAttempts: 1, 
  startDate: "", 
  endDate: "",
  visibility: "all",
  assignedStudents: []
};

export default function TestForm({ initialData }) { 
  const router = useRouter(); 
  const init = {...initialData}; 
  
  if(init.startDate) init.startDate = new Date(init.startDate).toISOString().slice(0, 16); 
  if(init.endDate) init.endDate = new Date(init.endDate).toISOString().slice(0, 16); 
  if(!init.visibility) init.visibility = "all";
  if(!init.assignedStudents) init.assignedStudents = [];
  else init.assignedStudents = init.assignedStudents.map(s => typeof s === "object" ? s._id : s);

  const [form, setForm] = useState({ ...defaults, ...init }); 
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false); 
  const [studentsList, setStudentsList] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (form.visibility === "specific" && studentsList.length === 0) {
      setLoadingStudents(true);
      fetch("/api/admin/students")
        .then(r => r.json())
        .then(data => {
          if(data.success) setStudentsList(data.students);
        })
        .finally(() => setLoadingStudents(false));
    }
  }, [form.visibility, studentsList.length]);

  const update = (key, value) => setForm({ ...form, [key]: value }); 

  const toggleStudent = (studentId) => {
    if (form.assignedStudents.includes(studentId)) {
      update("assignedStudents", form.assignedStudents.filter(id => id !== studentId));
    } else {
      update("assignedStudents", [...form.assignedStudents, studentId]);
    }
  };

  async function submit(e) { 
    e.preventDefault(); 
    setSaving(true); 
    setError(""); 
    
    const method = initialData?._id ? "PUT" : "POST"; 
    const url = initialData?._id ? `/api/admin/tests/${initialData._id}` : "/api/admin/tests"; 
    const payload = {...form}; 
    
    if(!payload.startDate) payload.startDate = null; 
    if(!payload.endDate) payload.endDate = null; 
    
    if (payload.visibility === "all") {
      payload.assignedStudents = [];
    }

    const response = await fetch(url, { 
      method, 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(payload) 
    }); 
    const data = await response.json(); 
    
    if (!data.success) { 
      setError(data.message); 
      setSaving(false); 
      return; 
    } 
    router.push("/admin/tests"); 
    router.refresh(); 
  } 

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">{initialData ? "Edit Test" : "Create Test"}</h1>
      
      {initialData?.status === "published" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          This test is published. Review changes carefully before saving.
        </p>
      )}

      {[["title","Test Name"],["subject","Subject"]].map(([key,label]) => (
        <label key={key} className="block text-sm font-medium">
          {label}
          <input required value={form[key]} onChange={(e) => update(key,e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
        </label>
      ))}

      <label className="block text-sm font-medium">
        Description
        <textarea value={form.description} onChange={(e) => update("description",e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        {[["duration","Duration (minutes)"],["totalMarks","Total Marks"],["negativeMarks","Negative Marks"],["passingPercentage","Passing Percentage"]].map(([key,label]) => (
          <label key={key} className="text-sm font-medium">
            {label}
            <input type="number" min="0" value={form[key]} onChange={(e) => update(key,e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
          </label>
        ))}
      </div>

      <label className="block text-sm font-medium">
        Instructions
        <textarea value={form.instructions} onChange={(e) => update("instructions",e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Max Attempts
          <input type="number" min="1" required value={form.maxAttempts} onChange={(e) => update("maxAttempts",e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        <label className="text-sm font-medium">
          Start Date (Optional)
          <input type="datetime-local" value={form.startDate} onChange={(e) => update("startDate",e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        <label className="text-sm font-medium">
          End Date (Optional)
          <input type="datetime-local" value={form.endDate} onChange={(e) => update("endDate",e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
        </label>
      </div>

      <div className="pt-2">
        <label className="block text-sm font-bold mb-2">Test Visibility</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="visibility" 
              value="all" 
              checked={form.visibility === "all"} 
              onChange={() => update("visibility", "all")} 
            />
            All Students
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="visibility" 
              value="specific" 
              checked={form.visibility === "specific"} 
              onChange={() => update("visibility", "specific")} 
            />
            Specific Students
          </label>
        </div>
      </div>

      {form.visibility === "specific" && (
        <div className="mt-3 border rounded-lg p-4 bg-slate-50 max-h-60 overflow-y-auto">
          <p className="text-sm font-semibold mb-3">Select Students:</p>
          {loadingStudents ? (
            <p className="text-sm text-slate-500">Loading students...</p>
          ) : studentsList.length === 0 ? (
            <p className="text-sm text-slate-500">No active students found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {studentsList.map(student => (
                <label key={student._id} className="flex items-center gap-2 text-sm bg-white p-2 rounded border cursor-pointer hover:bg-slate-100">
                  <input 
                    type="checkbox" 
                    checked={form.assignedStudents.includes(student._id)}
                    onChange={() => toggleStudent(student._id)}
                  />
                  <span>{student.name} <span className="text-slate-400 text-xs">({student.email})</span></span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {[["shuffleQuestions","Shuffle Questions"],["shuffleOptions","Shuffle Options"],["showResultImmediately","Show Result Immediately"]].map(([key,label]) => (
          <label key={key} className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={form[key]} onChange={(e) => update(key,e.target.checked)} />
            {label}
          </label>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      
      <button disabled={saving} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:bg-blue-400">
        {saving ? "Saving..." : "Save Test"}
      </button>
    </form>
  );
}