"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function TestDetailsPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(`/api/student/tests/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTest(data.data);
        } else {
          setError(data.message || "Failed to load test details.");
        }
      })
      .catch((err) => {
        setError("Error connecting to server.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const startTest = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await fetch(`/api/student/tests/${id}/start`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/student/tests/${id}/attempt`);
      } else {
        setError(data.message || "Failed to start test.");
        setStarting(false);
      }
    } catch (err) {
      setError("Network error.");
      setStarting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading test details...</div>;
  
  if (error) return (
    <div className="max-w-3xl mx-auto mt-8 bg-red-50 p-6 rounded-lg border border-red-200">
      <h2 className="text-red-700 text-lg font-semibold">Error</h2>
      <p className="text-red-600 mt-2">{error}</p>
      <button 
        onClick={() => router.push("/student")}
        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
      >
        Go Back
      </button>
    </div>
  );

  if (!test) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-blue-800 px-6 py-8 text-white">
          <h1 className="text-3xl font-bold">{test.title}</h1>
          <p className="mt-2 text-blue-100 text-lg">{test.subject}</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
              <span className="block text-sm text-gray-500 uppercase">Questions</span>
              <span className="block text-xl font-bold text-gray-900 mt-1">{test.questionCount}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
              <span className="block text-sm text-gray-500 uppercase">Duration</span>
              <span className="block text-xl font-bold text-gray-900 mt-1">{test.duration} min</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
              <span className="block text-sm text-gray-500 uppercase">Total Marks</span>
              <span className="block text-xl font-bold text-gray-900 mt-1">{test.totalMarks}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
              <span className="block text-sm text-gray-500 uppercase">Passing %</span>
              <span className="block text-xl font-bold text-gray-900 mt-1">{test.passingPercentage}%</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Description</h3>
            <div className="text-gray-600 whitespace-pre-wrap">
              {test.description || "No description provided."}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Instructions</h3>
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg border border-yellow-200">
              <ul className="list-disc pl-5 space-y-2">
                <li>Test duration is {test.duration} minutes.</li>
                <li>Each question has one correct answer.</li>
                {test.negativeMarks > 0 ? (
                  <li>Negative marking of {test.negativeMarks} marks will apply for each wrong answer.</li>
                ) : (
                  <li>There is no negative marking for this test.</li>
                )}
                <li>Test will be automatically submitted when time ends.</li>
                <li>Do not refresh the page unnecessarily.</li>
              </ul>
              {test.instructions && (
                <div className="mt-4 pt-4 border-t border-yellow-200 whitespace-pre-wrap">
                  {test.instructions}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={startTest}
              disabled={starting}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg shadow transition-colors"
            >
              {starting ? "Starting..." : "Start Test"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
