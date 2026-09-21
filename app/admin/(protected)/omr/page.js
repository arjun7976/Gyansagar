"use client";

import { useState, useEffect } from "react";
import { evaluateOmrScanResults } from "../../../../lib/omr/evaluator";

export default function AdminOMRPage() {
  // Test selection state
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [testDetails, setTestDetails] = useState(null);
  const [loadingTests, setLoadingTests] = useState(true);

  // Student selection & registration state
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentMobile, setNewStudentMobile] = useState("");
  const [newStudentBatch, setNewStudentBatch] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("Student@123");
  const [isRegisteringStudent, setIsRegisteringStudent] = useState(false);

  // Answer Key state
  const [answerKeyMap, setAnswerKeyMap] = useState({});
  const [answerKeySource, setAnswerKeySource] = useState("Manual Entry");
  const [answerKeyTab, setAnswerKeyTab] = useState("manual"); // "manual" | "paste" | "excel"
  const [pastedText, setPastedText] = useState("");
  const [answerKeyFile, setAnswerKeyFile] = useState(null);
  const [loadingAnswerKey, setLoadingAnswerKey] = useState(false);
  const [isParsingKey, setIsParsingKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // File & Scanning state
  const [file, setFile] = useState(null);
  const [scanPage, setScanPage] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanId, setScanId] = useState("");
  const [scanSummary, setScanSummary] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);
  const [showDebugModal, setShowDebugModal] = useState(false);

  // Answer Key Evaluation & Set State
  const [selectedSet, setSelectedSet] = useState("A");
  const [evaluationData, setEvaluationData] = useState(null);

  // Detections & Review state
  const [detections, setDetections] = useState({});
  const [questionCount, setQuestionCount] = useState(0);

  // System Feedback
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New OMR Test Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState("");
  const [newTestQuestions, setNewTestQuestions] = useState(100);
  const [newTestSubject, setNewTestSubject] = useState("General");
  const [newTestMarks, setNewTestMarks] = useState(1);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  // Load available OMR tests on mount
  useEffect(() => {
    fetchOMRTests();
  }, []);

  async function fetchOMRTests() {
    setLoadingTests(true);
    try {
      const res = await fetch("/api/admin/omr/tests");
      const data = await res.json();
      if (res.ok && data.success) {
        setTests(data.tests || []);
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to load tests." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Unable to connect to server to fetch tests." });
    } finally {
      setLoadingTests(false);
    }
  }

  // Create New OMR Test directly
  async function handleCreateOMRTest(e) {
    if (e) e.preventDefault();
    if (!newTestTitle.trim()) {
      setStatusMessage({ type: "warning", text: "Please enter Test Name (Title)." });
      return;
    }
    const qCount = parseInt(newTestQuestions, 10);
    if (!qCount || qCount < 1 || qCount > 300) {
      setStatusMessage({ type: "warning", text: "Please enter number of questions between 1 and 300." });
      return;
    }

    setIsCreatingTest(true);
    setStatusMessage({ type: "info", text: "Creating new OMR Test..." });

    try {
      const res = await fetch("/api/admin/omr/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTestTitle.trim(),
          questionCount: qCount,
          subject: newTestSubject.trim() || "General",
          marksPerQuestion: Number(newTestMarks) || 1
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: data.message });
        setShowCreateModal(false);
        setNewTestTitle("");
        setNewTestQuestions(100);
        setNewTestSubject("General");

        // Refresh tests list and automatically select the newly created test!
        await fetchOMRTests();
        if (data.test && data.test._id) {
          handleTestChange(data.test._id);
        }
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to create test." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Server error creating OMR test." });
    } finally {
      setIsCreatingTest(false);
    }
  }

  // When test is selected from dropdown
  async function handleTestChange(testId) {
    setSelectedTestId(testId);
    setTestDetails(null);
    setDetections({});
    setScanSummary(null);
    setRegistrationError(null);
    setQuestionCount(0);
    setAnswerKeyMap({});
    if (!testId) return;

    try {
      const res = await fetch(`/api/admin/omr/tests/${testId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTestDetails(data.data.test);
        const qCount = data.data.questionCount || 0;
        setQuestionCount(qCount);
        setStatusMessage({
          type: "success",
          text: `Selected "${data.data.test.title}" — Validated ${qCount} fixed OMR questions.`
        });

        // Load saved Answer Key for this test
        fetchSavedAnswerKey(testId, qCount);
      } else {
        setStatusMessage({ type: "error", text: data.message || "Invalid test configuration." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Error validating test for OMR." });
    }
  }

  // Fetch saved OMR answer key for the selected test
  async function fetchSavedAnswerKey(testId, totalQuestions) {
    setLoadingAnswerKey(true);
    try {
      const res = await fetch(`/api/admin/omr/answer-key?testId=${testId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const map = {};
        (data.data.answerKey || []).forEach((item) => {
          map[item.questionOrder] = item.answer;
        });
        setAnswerKeyMap(map);
      }
    } catch (err) {
      console.warn("Error fetching answer key:", err);
    } finally {
      setLoadingAnswerKey(false);
    }
  }

  // Search registered student accounts
  async function handleSearchStudents() {
    if (!studentSearch.trim()) return;
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/admin/omr/students?search=${encodeURIComponent(studentSearch.trim())}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents(data.results || []);
        if (data.results.length === 0) {
          setStatusMessage({ type: "warning", text: "No registered student matching your search." });
        }
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to search students." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Error searching student records." });
    } finally {
      setLoadingStudents(false);
    }
  }

  // Register New Student directly from Admin OMR panel
  async function handleRegisterStudent(e) {
    if (e) e.preventDefault();
    if (!newStudentName.trim()) {
      setStatusMessage({ type: "warning", text: "Please enter Student Name." });
      return;
    }
    if (!newStudentEmail.trim()) {
      setStatusMessage({ type: "warning", text: "Please enter Student Email." });
      return;
    }

    setIsRegisteringStudent(true);
    setStatusMessage({ type: "info", text: "Registering new student..." });

    try {
      const res = await fetch("/api/admin/omr/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName.trim(),
          email: newStudentEmail.trim(),
          mobile: newStudentMobile.trim(),
          batch: newStudentBatch.trim(),
          password: newStudentPassword.trim() || "Student@123"
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: data.message });
        setShowStudentModal(false);
        setSelectedStudent(data.student);
        setNewStudentName("");
        setNewStudentEmail("");
        setNewStudentMobile("");
        setNewStudentBatch("");
        setNewStudentPassword("Student@123");
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to register student." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Error registering student." });
    } finally {
      setIsRegisteringStudent(false);
    }
  }

  // Parse Excel, CSV, or Pasted Text for Answer Key
  async function handleParseAnswerKey() {
    if (!selectedTestId) {
      setStatusMessage({ type: "warning", text: "Please select an OMR test first." });
      return;
    }
    setIsParsingKey(true);
    setStatusMessage({ type: "info", text: "Parsing answer key..." });

    try {
      const formData = new FormData();
      formData.append("testId", selectedTestId);

      if (answerKeyTab === "excel" && answerKeyFile) {
        formData.append("file", answerKeyFile);
      } else if (answerKeyTab === "paste" && pastedText.trim()) {
        formData.append("pastedText", pastedText);
      } else {
        setStatusMessage({ type: "warning", text: "Please provide a file or copy-pasted text to parse." });
        setIsParsingKey(false);
        return;
      }

      const res = await fetch("/api/admin/omr/answer-key/parse", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const previewMap = { ...answerKeyMap };
        (data.data.preview || []).forEach((item) => {
          if (item.answer) {
            previewMap[item.questionOrder] = item.answer;
          }
        });
        setAnswerKeyMap(previewMap);
        setAnswerKeySource(data.data.sourceName);
        setStatusMessage({
          type: "success",
          text: `Answer Key Parsed (${data.data.validCount} valid answers out of ${data.data.totalQuestions}). Click "SAVE ANSWER KEY" to apply.`
        });
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to parse answer key." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Error parsing answer key file." });
    } finally {
      setIsParsingKey(false);
    }
  }

  // Save official OMR answer key server-side
  async function handleSaveAnswerKey() {
    if (!selectedTestId) {
      setStatusMessage({ type: "warning", text: "Please select an OMR test." });
      return;
    }

    const missingQs = [];
    const payloadKey = [];
    for (let q = 1; q <= questionCount; q++) {
      const ans = (answerKeyMap[q] || "").toUpperCase().trim();
      if (!ans || !["A", "B", "C", "D", "BLANK"].includes(ans)) {
        missingQs.push(q);
      }
      payloadKey.push({
        questionOrder: q,
        answer: ans
      });
    }

    if (missingQs.length > 0) {
      setStatusMessage({
        type: "warning",
        text: `Answer Key incomplete: ${missingQs.length} question(s) missing answers (Question #${missingQs.slice(0, 5).join(", ")}${missingQs.length > 5 ? "..." : ""}). Please set answers (A, B, C, D, or BLANK) for all questions before saving.`
      });
      return;
    }

    setIsSavingKey(true);
    setStatusMessage({ type: "info", text: "Saving official OMR answer key to server..." });

    try {
      const res = await fetch("/api/admin/omr/answer-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: selectedTestId,
          answerKey: payloadKey
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: data.message });
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to save answer key." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Server error saving answer key." });
    } finally {
      setIsSavingKey(false);
    }
  }

  // Update single question answer in Manual Grid
  function handleManualKeyChange(qNum, newAnswer) {
    setAnswerKeyMap((prev) => ({
      ...prev,
      [qNum]: newAnswer ? newAnswer.toUpperCase() : ""
    }));
  }

  // Compute answer key completeness
  const filledKeyCount = Object.keys(answerKeyMap).filter((k) => Number(k) <= questionCount && ["A", "B", "C", "D", "BLANK"].includes(answerKeyMap[k])).length;
  const isKeyComplete = questionCount > 0 && filledKeyCount === questionCount;

  // Scan uploaded sheet via Sharp scanner engine
  async function handleScanFile() {
    if (!file) {
      setStatusMessage({ type: "warning", text: "Please select an OMR image or PDF sheet first." });
      return;
    }
    if (!isKeyComplete) {
      setStatusMessage({ type: "warning", text: `Answer Key Incomplete (${filledKeyCount}/${questionCount} valid). Please complete and save the Answer Key before scanning.` });
      return;
    }

    setIsScanning(true);
    setRegistrationError(null);
    setScanSummary(null);
    setStatusMessage({ type: "info", text: "Uploading and scanning OMR sheet with 300 DPI precision engine..." });

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedTestId) formData.append("testId", selectedTestId);
      formData.append("set", selectedSet);
      formData.append("page", String(scanPage));

      const res = await fetch("/api/admin/omr/scan", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const rawAnswers = data.answers || [];
        const resultAnswers = {};

        if (Array.isArray(rawAnswers)) {
          rawAnswers.forEach((item) => {
            if (item && item.question != null) {
              resultAnswers[item.question] = {
                answer: item.selected || item.answer,
                status: item.status === "answered" ? "detected" : item.status,
                confidence: item.confidence,
                A: item.A,
                B: item.B,
                C: item.C,
                D: item.D
              };
            }
          });
        } else if (typeof rawAnswers === "object") {
          Object.assign(resultAnswers, rawAnswers);
        }

        const effectiveCount = data.questions_detected || questionCount || Object.keys(resultAnswers).length;
        if (effectiveCount > 0 && questionCount === 0) {
          setQuestionCount(effectiveCount);
        }

        setDetections((prev) => {
          const merged = { ...prev, ...resultAnswers };

          if (answerKeyMap && Object.keys(answerKeyMap).length > 0) {
            const keyList = Object.keys(answerKeyMap).map((q) => ({
              questionOrder: Number(q),
              answer: answerKeyMap[q]
            }));
            if (keyList.length > 0) {
              const evalRes = evaluateOmrScanResults(merged, keyList, {
                set: selectedSet,
                markingConfig: {
                  correctMarks: testDetails?.marksPerQuestion || 1,
                  wrongMarks: testDetails?.negativeMarks ? -Math.abs(testDetails.negativeMarks) : 0,
                  blankMarks: 0
                }
              });
              setEvaluationData(evalRes);
            }
          }

          return merged;
        });

        setScanId(`scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        setScanSummary({
          page: data.page || scanPage,
          answered: data.answered || 0,
          blank: data.blank || 0,
          multiple: data.multiple || 0,
          uncertain: data.uncertain || 0,
          debugImage: data.debug_image,
          diagnostics: data.diagnostics
        });

        setStatusMessage({
          type: "success",
          text: `Scan complete: Page ${data.page || scanPage} (${data.answered || 0} answered, ${data.blank || 0} blank, ${data.multiple || 0} multiple, ${data.uncertain || 0} uncertain). Total questions accumulated: ${Object.keys({ ...detections, ...resultAnswers }).length}.`
        });
      } else {
        // Registration Mark Failure or Scale Failure
        setRegistrationError({
          code: data.error_code || "REGISTRATION_MARKS_NOT_FOUND",
          message: data.message || "Registration marks could not be located reliably. Please ensure the OMR sheet is uncropped, unskewed, and clearly lit.",
          details: data.details || null
        });
        setStatusMessage({
          type: "error",
          text: `❌ Scan Rejected: ${data.message || "Registration marks could not be located reliably."}`
        });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to connect to scanner API." });
    } finally {
      setIsScanning(false);
    }
  }

  // Update choice for a specific question number in review grid
  function handleAnswerChange(qNum, newAnswer) {
    setDetections((prev) => {
      const updated = {
        ...prev,
        [qNum]: {
          ...(prev[qNum] || {}),
          selected: newAnswer ? newAnswer.toUpperCase() : null,
          answer: newAnswer ? newAnswer.toUpperCase() : null,
          status: newAnswer ? "answered" : "blank",
          confidence: 1.0
        }
      };

      if (answerKeyMap && Object.keys(answerKeyMap).length > 0) {
        const keyList = Object.keys(answerKeyMap).map((q) => ({
          questionOrder: Number(q),
          answer: answerKeyMap[q]
        }));
        if (keyList.length > 0) {
          const evalRes = evaluateOmrScanResults(updated, keyList, {
            set: selectedSet,
            markingConfig: {
              correctMarks: testDetails?.marksPerQuestion || 1,
              wrongMarks: testDetails?.negativeMarks ? -Math.abs(testDetails.negativeMarks) : 0,
              blankMarks: 0
            }
          });
          setEvaluationData(evalRes);
        }
      }

      return updated;
    });
  }

  // Confirm result and save official TestAttempt
  async function handleConfirmResult() {
    if (!selectedTestId) {
      setStatusMessage({ type: "warning", text: "Please select an OMR test." });
      return;
    }
    if (!selectedStudent) {
      setStatusMessage({ type: "warning", text: "Please select a registered GyanSagar student." });
      return;
    }
    if (!isKeyComplete) {
      setStatusMessage({ type: "warning", text: "Official Answer Key is incomplete. Please save complete answer key first." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ type: "info", text: "Submitting official TestAttempt to GyanSagar scoring engine..." });

    try {
      const res = await fetch("/api/admin/omr/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: selectedTestId,
          studentId: selectedStudent._id,
          detections,
          scanId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.duplicate) {
          setStatusMessage({
            type: "warning",
            text: `DUPLICATE NOTICE: ${data.message} (Attempt ID: ${data.data.attemptId}, Score: ${data.data.score})`
          });
        } else {
          setStatusMessage({
            type: "success",
            text: `OFFICIAL RESULT SAVED! Score: ${data.data.score} (${data.data.percentage}%) — Result: ${data.data.passed ? "PASSED" : "FAILED"}`
          });
        }
      } else {
        setStatusMessage({
          type: "error",
          text: data.message || "Failed to confirm OMR result."
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Server error confirming OMR result." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold px-3 py-1 rounded-full">
            GyanSagar OMR Precision System v3.0
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight font-heading">
            Offline OMR Evaluation & Precision Scanner
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Deterministic vector PDF generation, 300 DPI bilinear perspective warping, and inner-core bubble detection.
          </p>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage.text && (
        <div
          className={`p-4 rounded-2xl border font-semibold text-sm flex items-center justify-between shadow-sm transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : statusMessage.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : statusMessage.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage({ type: "", text: "" })} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Section: Printable OMR Vector Templates */}
      <section className="bg-gradient-to-br from-blue-900/90 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-blue-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-blue-800/60 pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">📄 Production Printable OMR Templates (PDF)</h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Vector PDF generated strictly at 210mm × 297mm A4 with 10mm corner registration boxes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/omr/template?questionCount=150&page=1&format=pdf&examTitle=${encodeURIComponent(testDetails?.title || "GyanSagar Examination")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow transition flex items-center gap-1.5"
            >
              📥 Page 1 PDF (Print)
            </a>
            <a
              href={`/api/admin/omr/template?questionCount=150&page=1&format=png&examTitle=${encodeURIComponent(testDetails?.title || "GyanSagar Examination")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow transition flex items-center gap-1.5"
            >
              🖼️ Page 1 PNG (Upload/Test)
            </a>
            <a
              href={`/api/admin/omr/template?questionCount=150&page=2&format=pdf&examTitle=${encodeURIComponent(testDetails?.title || "GyanSagar Examination")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow transition flex items-center gap-1.5"
            >
              📥 Page 2 PDF (Print)
            </a>
            <a
              href={`/api/admin/omr/template?questionCount=150&page=2&format=png&examTitle=${encodeURIComponent(testDetails?.title || "GyanSagar Examination")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow transition flex items-center gap-1.5"
            >
              🖼️ Page 2 PNG (Upload/Test)
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-blue-100">
          <div className="bg-blue-950/60 border border-blue-800/50 rounded-xl p-3">
            <p className="font-bold text-white mb-1">🖨️ Printing Guidelines</p>
            <p>Print on standard A4 paper at <strong>100% / Actual Size</strong>. Do NOT select "Fit to Page".</p>
          </div>
          <div className="bg-blue-950/60 border border-blue-800/50 rounded-xl p-3">
            <p className="font-bold text-white mb-1">🖊️ Filling Method</p>
            <p>Fill bubbles completely using dark <strong>Black or Blue ballpoint pen</strong> or 2B pencil.</p>
          </div>
          <div className="bg-blue-950/60 border border-blue-800/50 rounded-xl p-3">
            <p className="font-bold text-white mb-1">📐 Registration Corners</p>
            <p>Ensure all <strong>4 corner black squares</strong> are fully visible and uncropped in the photo/scan.</p>
          </div>
          <div className="bg-blue-950/60 border border-blue-800/50 rounded-xl p-3">
            <p className="font-bold text-white mb-1">📷 Scanning Quality</p>
            <p>Scan or take photo in well-lit area. <strong>300 DPI grayscale/color</strong> image format preferred.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Selection Controls */}
        <div className="space-y-6 lg:col-span-1">
          {/* Step 1: Select Test */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
                  1
                </span>
                <h2 className="font-bold text-slate-900 text-base">Select OMR Test</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1"
              >
                ➕ Create OMR Test
              </button>
            </div>

            {loadingTests ? (
              <p className="text-xs text-slate-500 animate-pulse">Loading OMR-compatible tests...</p>
            ) : (
              <select
                value={selectedTestId}
                onChange={(e) => handleTestChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
              >
                <option value="">-- Choose fixed OMR Test --</option>
                {tests.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.title} ({t.subject} — {t.totalMarks} Marks)
                  </option>
                ))}
              </select>
            )}

            {testDetails && (
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs space-y-2">
                <p className="font-semibold text-blue-900">{testDetails.title}</p>
                <p className="text-slate-600">Questions: <strong className="text-slate-900">{questionCount}</strong></p>
                <p className="text-slate-600">Total Marks: <strong className="text-slate-900">{testDetails.totalMarks}</strong></p>
                <p className="text-slate-600">Passing: <strong className="text-slate-900">{testDetails.passingPercentage}%</strong></p>
                <a
                  href={`/api/admin/results/export?testId=${selectedTestId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm mt-2"
                >
                  📊 Download Test Results Excel (.xlsx)
                </a>
              </div>
            )}
          </section>

          {/* Step 2: Select Student */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
                  2
                </span>
                <h2 className="font-bold text-slate-900 text-base">Select Registered Student</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1"
              >
                ➕ Register Student
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchStudents()}
                placeholder="Search name, email, mobile..."
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
              />
              <button
                onClick={handleSearchStudents}
                disabled={loadingStudents}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition"
              >
                {loadingStudents ? "..." : "Search"}
              </button>
            </div>

            {/* Students List */}
            {students.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-xl p-2 bg-slate-50 text-xs">
                {students.map((st) => (
                  <div
                    key={st._id}
                    onClick={() => setSelectedStudent(st)}
                    className={`p-2.5 rounded-lg cursor-pointer transition flex items-center justify-between ${
                      selectedStudent?._id === st._id
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-white hover:bg-slate-100 text-slate-800 border"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{st.name}</p>
                      <p className={`text-[11px] ${selectedStudent?._id === st._id ? "text-blue-100" : "text-slate-500"}`}>
                        {st.email} {st.mobile ? `• ${st.mobile}` : ""}
                      </p>
                    </div>
                    {selectedStudent?._id === st._id && <span>✓</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Selected Student Card */}
            {selectedStudent && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-emerald-900">Selected Student:</p>
                <p className="text-emerald-950 font-semibold">{selectedStudent.name}</p>
                <p className="text-emerald-700">{selectedStudent.email}</p>
                {selectedStudent.batch && <p className="text-emerald-700">Batch: {selectedStudent.batch}</p>}
              </div>
            )}
          </section>

          {/* Step 4: Upload OMR Sheet & Run Scanner */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
                4
              </span>
              <h2 className="font-bold text-slate-900 text-base">Upload OMR Sheet Image / PDF</h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Question Paper Set:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {["A", "B", "C", "D"].map((setName) => (
                  <button
                    key={setName}
                    type="button"
                    onClick={() => setSelectedSet(setName)}
                    className={`py-1.5 text-xs font-extrabold rounded-xl border transition ${
                      selectedSet === setName
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Set {setName}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Sheet Page Number:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScanPage(1)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                    scanPage === 1 ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Page 1 (Q1–150)
                </button>
                <button
                  type="button"
                  onClick={() => setScanPage(2)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                    scanPage === 2 ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Page 2 (Q151–300)
                </button>
              </div>
            </div>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setRegistrationError(null);
              }}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />

            <button
              onClick={handleScanFile}
              disabled={isScanning || !file || !isKeyComplete}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm py-3 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Analyzing 300 DPI Canvas...
                </>
              ) : (
                "Run Precision OMR Scanner"
              )}
            </button>

            {/* Explicit Registration Marks Not Found Error Banner */}
            {registrationError && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-xs space-y-2 text-red-900 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2 text-red-700 font-extrabold text-sm">
                  <span>❌ Registration Marks Not Found</span>
                </div>
                <p className="text-red-800 leading-relaxed font-medium">
                  {registrationError.message}
                </p>
                {registrationError.details && (
                  <div className="bg-white/80 p-2.5 rounded-xl text-[11px] font-mono text-red-950 border border-red-200 space-y-1">
                    <p>Candidates Found: {registrationError.details.candidatesFound || 0} / 4</p>
                    <p>Required Marks: 4 corner squares</p>
                    {registrationError.details.suggestion && (
                      <p className="text-red-700 font-sans italic mt-1">{registrationError.details.suggestion}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Answer Key & Review Grid */}
        <div className="space-y-6 lg:col-span-2">
          {/* Step 3: Answer Key Setup */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
                  3
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">Official Answer Key Setup</h2>
                  <p className="text-xs text-slate-500">
                    Input correct answers via Manual Grid, Copy-Paste, or Excel/CSV upload.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    isKeyComplete
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  {isKeyComplete
                    ? `✓ Answer Key Loaded (${filledKeyCount}/${questionCount} Valid)`
                    : `⚠ Key Incomplete (${filledKeyCount}/${questionCount} Valid)`}
                </span>
              </div>
            </div>

            {/* Answer Key Import Tabs */}
            <div className="flex border-b text-xs font-semibold space-x-4">
              <button
                onClick={() => setAnswerKeyTab("manual")}
                className={`pb-2 transition border-b-2 ${
                  answerKeyTab === "manual" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Manual Grid Table
              </button>
              <button
                onClick={() => setAnswerKeyTab("paste")}
                className={`pb-2 transition border-b-2 ${
                  answerKeyTab === "paste" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Fast Copy-Paste Text
              </button>
              <button
                onClick={() => setAnswerKeyTab("excel")}
                className={`pb-2 transition border-b-2 ${
                  answerKeyTab === "excel" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Upload Excel / CSV Sheet
              </button>
            </div>

            {/* Tab Contents */}
            {answerKeyTab === "paste" && (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste answers like:&#10;1-A&#10;2-B&#10;3-C&#10;4-D"
                  className="w-full text-xs font-mono p-3 border rounded-xl bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                />
                <button
                  onClick={handleParseAnswerKey}
                  disabled={isParsingKey || !pastedText.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {isParsingKey ? "Parsing..." : "IMPORT PASTED ANSWERS"}
                </button>
              </div>
            )}

            {answerKeyTab === "excel" && (
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setAnswerKeyFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <button
                  onClick={handleParseAnswerKey}
                  disabled={isParsingKey || !answerKeyFile}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {isParsingKey ? "Parsing Spreadsheet..." : "PARSE EXCEL / CSV KEY"}
                </button>
              </div>
            )}

            {/* Interactive Manual Answer Key Table */}
            {questionCount > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 border rounded-xl bg-slate-50">
                  {Array.from({ length: questionCount }, (_, idx) => idx + 1).map((qNum) => {
                    const ans = answerKeyMap[qNum] || "";
                    const isValid = ["A", "B", "C", "D", "BLANK"].includes(ans);
                    return (
                      <div key={qNum} className="flex items-center justify-between bg-white border p-1.5 px-2 rounded-lg text-xs">
                        <span className="font-bold text-slate-700">Q{qNum}</span>
                        <select
                          value={ans}
                          onChange={(e) => handleManualKeyChange(qNum, e.target.value)}
                          className={`font-bold rounded border px-1.5 py-0.5 outline-none text-xs ${
                            isValid ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          <option value="">--</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="BLANK">Blank</option>
                        </select>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-slate-500">
                    Source: <strong>{answerKeySource}</strong>
                  </span>
                  <button
                    onClick={handleSaveAnswerKey}
                    disabled={isSavingKey || !selectedTestId || questionCount === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow transition disabled:opacity-50"
                  >
                    {isSavingKey ? "Saving Key..." : "SAVE ANSWER KEY"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                Select an OMR test in Step 1 to load the question layout.
              </p>
            )}
          </section>

          {/* Step 5: Review Detected Bubble Choices & Quality Summary */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center">
                  5
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">Review Detected Bubble Choices</h2>
                  <p className="text-xs text-slate-500">
                    Verify scanner confidence and inspect annotated debug overlays.
                  </p>
                </div>
              </div>

              {scanSummary && scanSummary.debugImage && (
                <button
                  type="button"
                  onClick={() => setShowDebugModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition flex items-center gap-1.5"
                >
                  🔍 View Debug Overlay
                </button>
              )}
            </div>

            {/* Quality Breakdown Cards */}
            {scanSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-slate-50 border rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Page</p>
                  <p className="text-lg font-extrabold text-slate-800">{scanSummary.page}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Answered</p>
                  <p className="text-lg font-extrabold text-emerald-800">{scanSummary.answered}</p>
                </div>
                <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-600">Blank</p>
                  <p className="text-lg font-extrabold text-slate-700">{scanSummary.blank}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-red-700">Multiple</p>
                  <p className="text-lg font-extrabold text-red-800">{scanSummary.multiple}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-amber-700">Uncertain</p>
                  <p className="text-lg font-extrabold text-amber-800">{scanSummary.uncertain}</p>
                </div>
              </div>
            )}

            {/* Answer Key Evaluation Results Component */}
            {evaluationData && evaluationData.questionResults && (
              <div className="space-y-4 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-extrabold text-lg text-emerald-400">📊 Evaluated Result Summary (Set {evaluationData.set || selectedSet})</h3>
                    <p className="text-xs text-slate-300">Answer Key Matched by Question Number</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">{evaluationData.marks} / {evaluationData.maxMarks}</span>
                    <span className="ml-2 text-sm font-bold text-emerald-400">({evaluationData.percentage}%)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total Qs</p>
                    <p className="text-base font-extrabold text-white">{evaluationData.totalQuestions}</p>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Attempted</p>
                    <p className="text-base font-extrabold text-blue-300">{evaluationData.attempted}</p>
                  </div>
                  <div className="bg-emerald-950/80 border border-emerald-700/50 p-2.5 rounded-xl">
                    <p className="text-[10px] text-emerald-400 uppercase font-bold">Correct</p>
                    <p className="text-base font-extrabold text-emerald-300">{evaluationData.correct}</p>
                  </div>
                  <div className="bg-red-950/80 border border-red-700/50 p-2.5 rounded-xl">
                    <p className="text-[10px] text-red-400 uppercase font-bold">Wrong</p>
                    <p className="text-base font-extrabold text-red-300">{evaluationData.wrong}</p>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Blank</p>
                    <p className="text-base font-extrabold text-slate-300">{evaluationData.blank}</p>
                  </div>
                  <div className="bg-amber-950/80 border border-amber-700/50 p-2.5 rounded-xl">
                    <p className="text-[10px] text-amber-400 uppercase font-bold">Multiple</p>
                    <p className="text-base font-extrabold text-amber-300">{evaluationData.multiple}</p>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-800 text-slate-200 uppercase font-mono text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5 pl-4">Question</th>
                        <th className="p-2.5">Student Answer</th>
                        <th className="p-2.5">Correct Answer</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Result</th>
                        <th className="p-2.5 pr-4 text-right">Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {evaluationData.questionResults.map((q) => {
                        let resBadge = "bg-slate-800 text-slate-300 border-slate-700";
                        let resIcon = "—";
                        if (q.result === "correct") {
                          resBadge = "bg-emerald-950 text-emerald-300 border-emerald-700";
                          resIcon = "✅ Correct";
                        } else if (q.result === "wrong") {
                          resBadge = "bg-red-950 text-red-300 border-red-700";
                          resIcon = "❌ Wrong";
                        } else if (q.result === "blank") {
                          resBadge = "bg-slate-800 text-slate-400 border-slate-700";
                          resIcon = "⚪ Blank";
                        } else if (q.result === "multiple") {
                          resBadge = "bg-amber-950 text-amber-300 border-amber-700";
                          resIcon = "⚠️ Multiple";
                        }

                        return (
                          <tr key={q.question} className="hover:bg-slate-900/60 transition">
                            <td className="p-2.5 pl-4 font-bold text-white font-mono">Q{q.question}</td>
                            <td className="p-2.5 font-bold">{q.detected || "—"}</td>
                            <td className="p-2.5 font-bold text-emerald-400">{q.correctAnswer || "—"}</td>
                            <td className="p-2.5 capitalize text-slate-400">{q.status}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${resBadge}`}>
                                {resIcon}
                              </span>
                            </td>
                            <td className="p-2.5 pr-4 text-right font-extrabold text-white">{q.marks}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Detections Review Grid */}
            {Object.keys(detections).length === 0 ? (
              <div className="p-10 text-center border border-dashed rounded-2xl bg-slate-50 space-y-2">
                <p className="text-slate-400 font-medium text-sm">No scanner results loaded yet.</p>
                <p className="text-xs text-slate-400">
                  Select test, choose student, upload OMR sheet, and click "Run Precision OMR Scanner".
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grid Header Legend */}
                <div className="flex flex-wrap gap-4 text-xs font-semibold px-1">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Confident Answered
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> Low Confidence / Review
                  </span>
                  <span className="flex items-center gap-1.5 text-red-700">
                    <span className="w-3 h-3 rounded bg-red-500 inline-block"></span> Multiple Mark
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-3 h-3 rounded bg-slate-300 inline-block"></span> Blank
                  </span>
                </div>

                {/* Question Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto p-1">
                  {Object.keys(detections)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((qNum) => {
                      const item = detections[qNum] || {};
                      const choice = (item.answer || "").toUpperCase();
                      const isLowConf = item.confidence != null && Number(item.confidence) < 0.7;
                      const isMultiple = item.status === "multiple" || item.status === "ambiguous";

                      let borderColor = "border-emerald-300 bg-emerald-50/30";
                      if (isMultiple) borderColor = "border-red-400 bg-red-50";
                      else if (isLowConf) borderColor = "border-amber-400 bg-amber-50";
                      else if (!choice || item.status === "blank") borderColor = "border-slate-200 bg-slate-50";

                      return (
                        <div
                          key={qNum}
                          className={`border-2 rounded-xl p-3 text-center space-y-1.5 transition ${borderColor}`}
                        >
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>Q{qNum}</span>
                            {item.confidence != null && (
                              <span className="text-[10px] opacity-70">
                                {Math.round(Number(item.confidence) * 100)}%
                              </span>
                            )}
                          </div>

                          <div className="flex justify-center gap-1">
                            {["A", "B", "C", "D"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleAnswerChange(qNum, choice === opt ? null : opt)}
                                className={`w-7 h-7 rounded-lg text-xs font-extrabold transition ${
                                  choice === opt
                                    ? "bg-blue-600 text-white shadow"
                                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Step 6: Confirm & Save Result */}
            <div className="border-t pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600">
                  Ready to store official GyanSagar attempt?
                </p>
                <p className="text-[11px] text-slate-400">
                  Will trigger GyanSagar official scoring engine with source = "omr".
                </p>
              </div>

              <button
                onClick={handleConfirmResult}
                disabled={isSubmitting || !selectedTestId || !selectedStudent || !isKeyComplete || Object.keys(detections).length === 0}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm px-8 py-3.5 rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {isSubmitting ? "Processing Attempt..." : "CONFIRM & SAVE RESULT"}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Create New OMR Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg">➕ Create New OMR Test</h3>
                <p className="text-xs text-blue-200">Quickly create a fixed OMR test with questions count.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOMRTest} className="p-6 space-y-4 text-xs font-medium text-slate-700">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 block">Test Name (Title): *</label>
                <input
                  type="text"
                  required
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                  placeholder="e.g. NEET Full Length Mock Test 1"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">Total Questions: *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="300"
                    value={newTestQuestions}
                    onChange={(e) => setNewTestQuestions(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">1 to 300 Questions</p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">Marks Per Question:</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={newTestMarks}
                    onChange={(e) => setNewTestMarks(e.target.value)}
                    placeholder="1"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Total Marks: {Number(newTestQuestions || 0) * Number(newTestMarks || 1)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 block">Subject / Category:</label>
                <input
                  type="text"
                  value={newTestSubject}
                  onChange={(e) => setNewTestSubject(e.target.value)}
                  placeholder="e.g. Physics / Chemistry / Biology"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTest}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 text-xs"
                >
                  {isCreatingTest ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Creating Test...
                    </>
                  ) : (
                    "Create OMR Test"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Register New Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg">➕ Register New Student</h3>
                <p className="text-xs text-emerald-200">Register a new student account to assign OMR scan results.</p>
              </div>
              <button
                onClick={() => setShowStudentModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="p-6 space-y-4 text-xs font-medium text-slate-700">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 block">Student Full Name: *</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Khusbhu Sharma"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 block">Email Address: *</label>
                <input
                  type="email"
                  required
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="e.g. khusbhu@example.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">Mobile Number:</label>
                  <input
                    type="tel"
                    value={newStudentMobile}
                    onChange={(e) => setNewStudentMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">Batch / Roll No:</label>
                  <input
                    type="text"
                    value={newStudentBatch}
                    onChange={(e) => setNewStudentBatch(e.target.value)}
                    placeholder="e.g. Batch A-2026"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 block">Initial Password:</label>
                <input
                  type="text"
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  placeholder="Student@123"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400">Default password: Student@123</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringStudent}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 text-xs"
                >
                  {isRegisteringStudent ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Registering...
                    </>
                  ) : (
                    "Register & Select Student"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debug Image Overlay Modal */}
      {showDebugModal && scanSummary?.debugImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base">🔍 OMR Scanner Rectified Debug Image Overlay</h3>
                <p className="text-xs text-slate-300">
                  Blue = Corner Registration Marks, Green = Answered, Red = Blank, Yellow = Uncertain, Orange = Multiple
                </p>
              </div>
              <button
                onClick={() => setShowDebugModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg"
              >
                Close ✕
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 flex justify-center bg-slate-900">
              <img
                src={scanSummary.debugImage}
                alt="Warped OMR Debug Image Overlay"
                className="max-h-[75vh] w-auto object-contain rounded-xl border border-slate-800 shadow-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
