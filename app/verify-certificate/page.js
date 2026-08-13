"use client";
import { useState } from "react";
import Link from "next/link";

export default function VerifyCertificatePage() {
  const [certificateId, setCertificateId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyCertificate = async (e) => {
    e.preventDefault();
    if (!certificateId.trim()) {
      setError("Please enter a certificate ID");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/certificates/verify/${certificateId.trim()}`);
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message);
        if (data.revoked) {
          setResult({ revoked: true });
        }
      }
    } catch (e) {
      setError("Failed to verify certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Certificate Verification</h1>
          <p className="text-gray-600">Verify the authenticity of a GyanSagar certificate</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={verifyCertificate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificate ID
              </label>
              <input
                type="text"
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value)}
                placeholder="e.g., GS-2026-A8F92K71"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Certificate"}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-center font-medium">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
              {result.revoked ? (
                <div className="text-center">
                  <div className="text-4xl mb-2">⚠️</div>
                  <h3 className="text-xl font-bold text-red-700 mb-2">Certificate Revoked</h3>
                  <p className="text-gray-600">This certificate has been revoked by the administration.</p>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">✅</div>
                    <h3 className="text-xl font-bold text-green-700">Certificate Verified</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-green-200 pb-2">
                      <span className="text-gray-600">Student Name</span>
                      <span className="font-medium text-gray-800">{result.studentName}</span>
                    </div>
                    <div className="flex justify-between border-b border-green-200 pb-2">
                      <span className="text-gray-600">Test Name</span>
                      <span className="font-medium text-gray-800">{result.testName}</span>
                    </div>
                    <div className="flex justify-between border-b border-green-200 pb-2">
                      <span className="text-gray-600">Subject</span>
                      <span className="font-medium text-gray-800">{result.subject}</span>
                    </div>
                    <div className="flex justify-between border-b border-green-200 pb-2">
                      <span className="text-gray-600">Percentage</span>
                      <span className="font-bold text-green-600">{result.percentage}%</span>
                    </div>
                    <div className="flex justify-between border-b border-green-200 pb-2">
                      <span className="text-gray-600">Rank</span>
                      <span className="font-medium text-gray-800">#{result.rank || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issued Date</span>
                      <span className="text-sm text-gray-600">{new Date(result.issuedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
