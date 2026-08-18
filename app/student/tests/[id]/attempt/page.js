"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function TestAttemptPage({ params }) {
  const router = useRouter();
  const { id } = use(params);

  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [attemptId, setAttemptId] = useState(null);
  const [testDetails, setTestDetails] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: "A" }
  const [markedForReview, setMarkedForReview] = useState(new Set()); // Set of questionIds
  
  const [timeLeft, setTimeLeft] = useState(null);
  const [saveStatus, setSaveStatus] = useState(""); // "Saving...", "Saved", "Error"
  
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  // Anti-cheat states
  const [examStarted, setExamStarted] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [warningModalMessage, setWarningModalMessage] = useState("");
  
  const timerRef = useRef(null);

  // Load Attempt Data
  useEffect(() => {
    let isMounted = true;
    
    // First, we need to know the active attempt for this test
    fetch(`/api/student/tests/${id}/start`, { method: "POST" })
      .then(res => res.json())
      .then(startData => {
        if (!isMounted) return;
        if (!startData.success) {
          setError(startData.message || "Failed to load test attempt.");
          setLoading(false);
          return;
        }
        
        const attId = startData.data.attemptId;
        setAttemptId(attId);
        
        // Fetch full attempt details
        return fetch(`/api/student/attempts/${attId}`);
      })
      .then(res => res?.json())
      .then(data => {
        if (!isMounted || !data) return;
        
        if (data.success) {
          setTestDetails(data.data.test);
          setQuestions(data.data.questions);
          setTimeLeft(data.data.attempt.timeRemaining);
          
          // Reconstruct answers map
          const ansMap = {};
          data.data.attempt.answers.forEach(a => {
            ansMap[a.questionId] = a.answer;
          });
          setAnswers(ansMap);
          
          // Reconstruct marked for review set
          setMarkedForReview(new Set(data.data.attempt.markedForReview));
          
          // If already submitted, redirect to result
          if (data.data.attempt.status !== "in_progress") {
            router.push(`/student/results/${data.data.attempt.id}`);
            return;
          }
          
        } else {
          setError(data.message || "Error fetching attempt data.");
        }
        setLoading(false);
      })
      .catch(err => {
        if (isMounted) {
          setError("Network error. Please refresh.");
          setLoading(false);
        }
      });
      
    return () => { isMounted = false; };
  }, [id, router]);

  // Timer Countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || loading || !examStarted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, loading, examStarted]);

  // Anti-Cheat Observers
  useEffect(() => {
    if (!examStarted) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleWarning("Tab switching or minimizing the browser is strictly prohibited!");
      }
    };
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleWarning("Exiting fullscreen is prohibited!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [examStarted]);

  const handleWarning = (msg) => {
    setWarnings(prev => {
      const newWarnings = prev + 1;
      if (newWarnings >= 3) {
        alert("Maximum warnings reached. Your test is being auto-submitted.");
        handleAutoSubmit();
      } else {
        setWarningModalMessage(`WARNING ${newWarnings}/3: ${msg}\n\nIf you reach 3 warnings, your test will be auto-submitted.`);
      }
      return newWarnings;
    });
  };

  const startExam = () => {
    document.documentElement.requestFullscreen().then(() => {
      setExamStarted(true);
    }).catch(err => {
      alert("Please allow fullscreen mode to start the test.");
    });
  };

  const handleAutoSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/student/attempts/${attemptId}/submit`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/student/results/${attemptId}`);
      } else {
        alert("Time is over, but there was an error submitting. Please refresh.");
      }
    } catch (err) {
      alert("Network error during auto-submit. Please check connection.");
    }
  };

  const handleManualSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/student/attempts/${attemptId}/submit`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/student/results/${attemptId}`);
      } else {
        alert(data.message || "Error submitting test.");
        setSubmitting(false);
        setShowSubmitModal(false);
      }
    } catch (err) {
      alert("Network error. Could not submit.");
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const saveAnswer = async (qId, answer) => {
    setAnswers(prev => ({ ...prev, [qId]: answer }));
    setSaveStatus("Saving...");
    try {
      const res = await fetch(`/api/student/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: qId, answer })
      });
      if (res.ok) {
        setSaveStatus("Saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } else {
        setSaveStatus("Error saving!");
      }
    } catch (e) {
      setSaveStatus("Network error!");
    }
  };

  const toggleMarkForReview = async () => {
    const qId = questions[currentIdx]._id;
    const isMarked = markedForReview.has(qId);
    
    // Optimistic UI update
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (isMarked) newSet.delete(qId);
      else newSet.add(qId);
      return newSet;
    });

    try {
      await fetch(`/api/student/attempts/${attemptId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: qId, marked: !isMarked })
      });
    } catch (e) {
      // Ignore network errors for review marks for now
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-xl font-medium text-gray-500">Loading Test Interface...</div>;
  if (error) return (
    <div className="flex h-screen items-center justify-center">
      <div className="bg-red-50 p-8 rounded-lg shadow-sm text-center border border-red-100">
        <h2 className="text-red-600 text-xl font-bold mb-2">Error</h2>
        <p className="text-red-500">{error}</p>
        <button onClick={() => router.push("/student")} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">Go Back</button>
      </div>
    </div>
  );

  const currentQ = questions[currentIdx];
  const qId = currentQ?._id;
  
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedForReview.size;

  if (!examStarted) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg text-center border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Strict Exam Environment</h2>
          <p className="text-gray-600 mb-6">
            This test is actively monitored. By starting, you agree to the following rules:
          </p>
          <ul className="text-left text-sm text-gray-700 space-y-3 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">1.</span>
              <strong>No Tab Switching:</strong> You cannot switch tabs or minimize the browser.
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">2.</span>
              <strong>Fullscreen Only:</strong> You cannot exit fullscreen mode.
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">3.</span>
              <strong>No Copy/Paste:</strong> Right-clicking, copying, and pasting are disabled.
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">4.</span>
              <strong>3 Warnings:</strong> If you violate these rules 3 times, your test will automatically submit.
            </li>
          </ul>
          <button 
            onClick={startExam}
            className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 transition-all text-lg"
          >
            I Agree, Start Fullscreen Exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-screen bg-gray-50 overflow-hidden select-none"
      onCopy={e => e.preventDefault()}
      onPaste={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Warning Modal */}
      {warningModalMessage && (
        <div className="fixed inset-0 bg-red-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-4 border-red-500 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl text-red-600">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">SECURITY WARNING</h2>
            <p className="text-gray-800 text-lg mb-8 whitespace-pre-wrap font-medium">{warningModalMessage}</p>
            <button 
              onClick={() => {
                setWarningModalMessage("");
                document.documentElement.requestFullscreen().catch(() => {});
              }}
              className="w-full py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-md transition-colors"
            >
              I Understand, Return to Test
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-800 text-white shadow-md z-10 shrink-0">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-xl font-bold truncate">{testDetails?.title}</h1>
          </div>
          <div className="flex items-center space-x-6">
            {saveStatus && (
              <span className={`text-sm font-medium ${saveStatus.includes("Error") ? "text-red-300" : "text-green-300"}`}>
                {saveStatus}
              </span>
            )}
            <div className="flex items-center bg-blue-900 px-4 py-2 rounded-lg border border-blue-700">
              <span className="text-sm uppercase tracking-wider text-blue-200 mr-2">Time Left</span>
              <span className={`font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-400' : 'text-white'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Question Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800">Question {currentIdx + 1} <span className="text-sm font-normal text-gray-400">of {questions.length}</span></h2>
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm font-medium">Marks: {currentQ.marks}</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-lg text-gray-800 mb-8 whitespace-pre-wrap leading-relaxed">
                {currentQ.questionText}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {["A", "B", "C", "D"].map((opt) => (
                  <label 
                    key={opt}
                    className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                      answers[qId] === opt 
                        ? "border-blue-600 bg-blue-50 shadow-sm" 
                        : "border-gray-200 hover:bg-gray-50 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 mr-4 flex-shrink-0 transition-colors ${answers[qId] === opt ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}">
                      <span className={`text-sm font-bold ${answers[qId] === opt ? 'text-white' : 'text-gray-500'}`}>{opt}</span>
                    </div>
                    <input 
                      type="radio" 
                      name="option" 
                      className="hidden" 
                      checked={answers[qId] === opt} 
                      onChange={() => saveAnswer(qId, opt)} 
                    />
                    <span className="text-gray-700 text-base flex-1">{currentQ.options[opt]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Footer */}
          <footer className="bg-gray-50 border-t border-gray-200 p-4 shrink-0">
            <div className="max-w-4xl mx-auto flex justify-between items-center gap-4 flex-wrap">
              <button 
                onClick={toggleMarkForReview}
                className="px-6 py-2.5 rounded-lg font-medium text-sm border-2 transition-colors flex items-center shadow-sm bg-white hover:bg-yellow-50 border-yellow-400 text-yellow-700"
              >
                {markedForReview.has(qId) ? "Unmark Review" : "Mark for Review"}
              </button>

              <div className="flex space-x-3">
                <button 
                  disabled={currentIdx === 0} 
                  onClick={() => setCurrentIdx(prev => prev - 1)}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
                >
                  Previous
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button 
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                  >
                    Next Question
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowSubmitModal(true)}
                    className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors"
                  >
                    Finish Test
                  </button>
                )}
              </div>
            </div>
          </footer>
        </main>

        {/* Right Sidebar - Question Palette */}
        <aside className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col shrink-0 hidden lg:flex shadow-inner z-0">
          <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
            <h3 className="font-bold text-gray-800 text-center">Question Palette</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q._id];
                const isMarked = markedForReview.has(q._id);
                const isCurrent = idx === currentIdx;

                let btnClass = "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"; // Default (Not Visited/Not Answered)
                
                if (isAnswered && isMarked) {
                  btnClass = "bg-purple-600 border-purple-700 text-white"; // Answered + Marked
                } else if (isAnswered) {
                  btnClass = "bg-green-500 border-green-600 text-white"; // Answered
                } else if (isMarked) {
                  btnClass = "bg-yellow-500 border-yellow-600 text-white"; // Marked but not answered
                }
                
                if (isCurrent) {
                  btnClass += " ring-2 ring-offset-2 ring-blue-500 scale-110";
                }

                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`w-12 h-12 rounded-lg border font-bold shadow-sm flex items-center justify-center transition-all duration-200 ${btnClass}`}
                    title={isMarked ? (isAnswered ? "Answered & Marked" : "Marked for Review") : (isAnswered ? "Answered" : "Not Answered")}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Legend & Submit */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex items-center"><div className="w-5 h-5 rounded border bg-green-500 mr-3"></div> <span className="text-gray-600">Answered ({answeredCount})</span></div>
              <div className="flex items-center"><div className="w-5 h-5 rounded border bg-white mr-3"></div> <span className="text-gray-600">Not Answered ({questions.length - answeredCount})</span></div>
              <div className="flex items-center"><div className="w-5 h-5 rounded border bg-yellow-500 mr-3"></div> <span className="text-gray-600">Marked for Review</span></div>
              <div className="flex items-center"><div className="w-5 h-5 rounded border bg-purple-600 mr-3"></div> <span className="text-gray-600">Answered & Marked</span></div>
            </div>
            <button 
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md transition-colors uppercase tracking-wider text-sm"
            >
              Submit Test
            </button>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Test?</h2>
            <p className="text-gray-600 mb-6 pb-6 border-b border-gray-100">Are you sure you want to submit your test? You cannot change your answers after submission.</p>
            
            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-600">Answered</span>
                <span className="font-bold text-green-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-600">Unanswered</span>
                <span className="font-bold text-red-600">{questions.length - answeredCount}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Marked for Review</span>
                <span className="font-bold text-yellow-600">{markedCount}</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <button 
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={submitting}
                onClick={handleManualSubmit}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-md transition-colors flex justify-center items-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Submitting
                  </>
                ) : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
