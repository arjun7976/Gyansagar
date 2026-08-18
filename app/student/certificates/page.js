"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/certificates")
      .then(r => r.json())
      .then(d => {
        if (d.success) setCertificates(d.data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const downloadCertificate = async (id, certificateId) => {
    try {
      const res = await fetch(`/api/student/certificates/${id}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `certificate-${certificateId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error("Failed to download certificate:", e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading certificates...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">My Certificates</h1>
        <p className="text-gray-500 mt-1">Download your achievement certificates</p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Certificates Yet</h3>
          <p className="text-gray-500 mb-6">Complete tests with certificate enabled to earn certificates.</p>
          <Link href="/student" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map(cert => (
            <div key={cert._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={`p-6 text-white text-center ${cert.type === "monthly" ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-gradient-to-br from-yellow-400 to-orange-500"}`}>
                <div className="text-4xl mb-2">{cert.type === "monthly" ? "🏆" : "📜"}</div>
                {cert.type === "monthly" ? (
                  <>
                    <h3 className="text-lg font-bold">Monthly Champion</h3>
                    <p className="text-sm opacity-90">{cert.monthYear}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold">{cert.testId?.title || "Certificate"}</h3>
                    <p className="text-sm opacity-90">{cert.testId?.subject || ""}</p>
                  </>
                )}
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Score</span>
                  <span className="font-bold text-green-600">{cert.percentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rank</span>
                  <span className="font-bold text-blue-600">#{cert.rank || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Issued</span>
                  <span className="text-sm text-gray-600">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                </div>
                <div className="pt-3 border-t">
                  <button
                    onClick={() => downloadCertificate(cert._id, cert.certificateId)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/student" className="block text-center text-blue-600 hover:underline">
        ← Back to Dashboard
      </Link>
    </div>
  );
}
