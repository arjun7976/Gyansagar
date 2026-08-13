export function getResultWhatsAppTemplate(student, test, attempt, rank, totalParticipants) {
  const resultText = attempt.passed ? "✅ PASS" : "❌ FAIL";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const message = `
*GYANSAGAR TEST SYSTEM*
ज्ञानसागर कोचिंग क्लासेज

Your test result is ready! 📊

*Test:* ${test.title}
*Subject:* ${test.subject}

*Score:* ${attempt.score} / ${test.totalMarks}
*Percentage:* ${attempt.percentage}%
*Result:* ${resultText}
*Rank:* #${rank} / ${totalParticipants}

*Performance:*
✅ Correct: ${attempt.correctAnswers}
❌ Wrong: ${attempt.wrongAnswers}
⏭️ Unattempted: ${attempt.unattemptedAnswers}
🎯 Accuracy: ${attempt.accuracy}%

View detailed result:
${baseUrl}/student/results/${attempt._id}

---
This is an automated message.
© ${new Date().getFullYear()} GyanSagar Coaching Classes
  `.trim();

  return message;
}
