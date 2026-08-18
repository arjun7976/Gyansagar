import { createPDF, addHeader, addFooter, addSection, addTableRow, checkPageBreak, formatDate, formatTime } from "./helpers";

export async function generateResultPDF(attempt, test, student, questions, rank, totalParticipants) {
  const doc = createPDF();
  let y = 50;
  let pageNumber = 1;

  // Header
  addHeader(doc, "RESULT REPORT");

  // Student Information
  y = addSection(doc, "Student Information", y);
  doc.setFontSize(11);
  doc.text(`Name: ${student.name}`, 15, y);
  y += 6;
  doc.text(`Test: ${test.title}`, 15, y);
  y += 6;
  doc.text(`Subject: ${test.subject}`, 15, y);
  y += 6;
  doc.text(`Test Date: ${formatDate(attempt.submittedAt)}`, 15, y);
  y += 10;

  // Result Summary
  y = checkPageBreak(doc, y, 40);
  y = addSection(doc, "Result Summary", y);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Score: ${attempt.score} / ${test.totalMarks}`, 15, y);
  y += 7;
  doc.text(`Percentage: ${attempt.percentage}%`, 15, y);
  y += 7;
  
  const resultText = attempt.passed ? "PASS" : "FAIL";
  const resultColor = attempt.passed ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(...resultColor);
  doc.text(`Result: ${resultText}`, 15, y);
  y += 7;
  doc.setTextColor(0, 0, 0);
  
  doc.text(`Rank: ${rank} / ${totalParticipants}`, 15, y);
  y += 10;

  // Performance Metrics
  y = checkPageBreak(doc, y, 50);
  y = addSection(doc, "Performance Metrics", y);

  const metrics = [
    ["Correct", attempt.correctAnswers.toString()],
    ["Wrong", attempt.wrongAnswers.toString()],
    ["Unattempted", attempt.unattemptedAnswers.toString()],
    ["Accuracy", `${attempt.accuracy}%`],
    ["Time Taken", formatTime(attempt.timeTakenSeconds)]
  ];

  metrics.forEach(([label, value]) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, 15, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, 50, y);
    y += 7;
  });
  y += 5;

  // Question-wise Analysis Table
  y = checkPageBreak(doc, y, 30);
  y = addSection(doc, "Question-wise Summary", y);

  // Table headers
  y = addTableRow(doc, ["Q.No", "Status", "Your Answer", "Correct Answer", "Marks"], y, true);
  y += 2;

  // Question rows
  questions.forEach((q, idx) => {
    y = checkPageBreak(doc, y, 15);
    const userAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString())?.answer;
    let status = "Unattempted";
    let marksGained = 0;

    if (!userAnswer) {
      status = "Unattempted";
    } else if (userAnswer === q.correctAnswer) {
      status = "Correct";
      marksGained = q.marks;
    } else {
      status = "Wrong";
      marksGained = -test.negativeMarks;
    }

    const userAnsText = userAnswer ? `${userAnswer}: ${q.options[userAnswer]}` : "Not Attempted";
    const correctAnsText = `${q.correctAnswer}: ${q.options[q.correctAnswer]}`;
    const marksText = marksGained > 0 ? `+${marksGained}` : marksGained.toString();

    y = addTableRow(doc, [idx + 1, status, userAnsText.substring(0, 25), correctAnsText.substring(0, 25), marksText], y);
  });

  // Detailed Answer Key Section
  doc.addPage();
  pageNumber++;
  y = 20;
  y = addSection(doc, "Detailed Answer Key", y);
  
  questions.forEach((q, idx) => {
    // Break page if remaining space is small
    y = checkPageBreak(doc, y, 60);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Question ${idx + 1}:`, 15, y);
    y += 7;

    // Split long question text to fit within page width (approx 180 max width)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitQuestion = doc.splitTextToSize(q.questionText, 170);
    doc.text(splitQuestion, 15, y);
    y += (splitQuestion.length * 5) + 5;

    // Student and Correct Answer
    const userAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString())?.answer;
    const userAnsText = userAnswer ? `${userAnswer}) ${q.options[userAnswer]}` : "Not Attempted";
    const correctAnsText = `${q.correctAnswer}) ${q.options[q.correctAnswer]}`;
    
    let isCorrect = false;
    if(userAnswer === q.correctAnswer) isCorrect = true;
    else if(!userAnswer) isCorrect = null;

    doc.setFont("helvetica", "bold");
    doc.text("Your Answer: ", 15, y);
    doc.setFont("helvetica", "normal");
    
    if(isCorrect === true) doc.setTextColor(34, 197, 94); // Green
    else if(isCorrect === false) doc.setTextColor(239, 68, 68); // Red
    else doc.setTextColor(100, 100, 100); // Gray
    
    const splitUserAns = doc.splitTextToSize(userAnsText, 140);
    doc.text(splitUserAns, 45, y);
    y += (splitUserAns.length * 5);
    doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "bold");
    doc.text("Correct Answer: ", 15, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(34, 197, 94); // Green
    const splitCorrectAns = doc.splitTextToSize(correctAnsText, 140);
    doc.text(splitCorrectAns, 45, y);
    y += (splitCorrectAns.length * 5) + 3;
    doc.setTextColor(0, 0, 0);

    // Explanation
    if (q.explanation) {
      y = checkPageBreak(doc, y, 20);
      doc.setFont("helvetica", "italic");
      doc.text("Explanation:", 15, y);
      y += 5;
      const splitExplanation = doc.splitTextToSize(q.explanation, 170);
      doc.text(splitExplanation, 15, y);
      y += (splitExplanation.length * 5) + 5;
    }
    
    y += 5; // space between questions
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 10;
  });

  // Footer
  addFooter(doc, pageNumber);

  return doc;
}
