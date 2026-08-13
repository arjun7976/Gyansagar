"use client";

import Link from "next/link";

export default function ResultActionButtons({ attemptId, testId, title, percentage }) {
  const handleShare = async () => {
    const shareData = {
      title: `GyanSagar Test Result - ${title}`,
      text: `I scored ${percentage}% in ${title}!`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/student/results/${attemptId}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
        copyToClipboard(shareData.url);
      }
    } else {
      copyToClipboard(shareData.url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Result link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
      <button
        onClick={() => window.open(`/api/student/results/${attemptId}/pdf`, '_blank')}
        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow text-center"
      >
        Download PDF
      </button>
      <button
        onClick={handleShare}
        className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow text-center"
      >
        Share Result
      </button>
      <Link href={`/student/tests/${testId}/leaderboard`} className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow text-center">
        View Leaderboard
      </Link>
      <Link href="/student" className="bg-gray-200 text-gray-800 px-8 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors shadow text-center">
        Back to Dashboard
      </Link>
    </div>
  );
}
