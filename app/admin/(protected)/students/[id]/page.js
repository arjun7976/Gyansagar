"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      const data = await res.json();
      if (data.success) {
        setStudent(data.data);
        setHistory(data.data.history || []);
        setName(data.data.name || "");
        setEmail(data.data.email || "");
        setMobile(data.data.mobile || "");
        setIsActive(data.data.isActive ?? true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile, isActive, password })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage("Student updated successfully");
        setPassword(""); // Clear password field after save
        fetchStudent();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!student) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Student Profile</h1>
        <Link href="/admin/students" className="text-blue-600 hover:underline">
          &larr; Back to Students
        </Link>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}
      {message && <div className="p-4 bg-green-50 text-green-700 rounded-lg">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Edit Profile Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Edit Details</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile</label>
              <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
              <label htmlFor="isActive" className="text-sm font-medium">Account Active</label>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium mb-1 text-red-600">Reset Password (Optional)</label>
              <input type="password" placeholder="Min 8 chars..." value={password} onChange={e => setPassword(e.target.value)} minLength={8} className="w-full p-2 border border-red-200 rounded" />
              <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
            </div>
            <button type="submit" disabled={saving} className="w-full mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Test History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Test History & Ranks</h2>
          {history.length === 0 ? (
            <p className="text-gray-500">This student has not submitted any tests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 text-gray-700 border-b">
                  <tr>
                    <th className="p-3">Test Name</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 font-bold text-blue-700">Rank</th>
                    <th className="p-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map(attempt => (
                    <tr key={attempt._id.toString()} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{attempt.testName}</td>
                      <td className="p-3">{attempt.score} / {attempt.totalMarks} ({attempt.percentage}%)</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${attempt.result === "Pass" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {attempt.result}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-blue-700">
                        {attempt.rank} <span className="text-gray-400 font-normal text-xs">/ {attempt.totalParticipants}</span>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">
                        {new Date(attempt.submittedAt).toLocaleDateString()}
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
