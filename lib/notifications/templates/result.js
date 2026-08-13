export function getResultEmailTemplate(student, test, attempt, rank, totalParticipants) {
  const resultText = attempt.passed ? "PASS" : "FAIL";
  const resultColor = attempt.passed ? "#22c55e" : "#ef4444";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .result-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${resultColor}; }
        .score { font-size: 32px; font-weight: bold; color: #2563eb; }
        .result-badge { display: inline-block; padding: 8px 20px; background: ${resultColor}; color: white; border-radius: 20px; font-weight: bold; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .stat { background: white; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GYANSAGAR TEST SYSTEM</h1>
          <p>ज्ञानसागर कोचिंग क्लासेज</p>
        </div>
        <div class="content">
          <h2>Your Test Result is Ready!</h2>
          <p>Dear <strong>${student.name}</strong>,</p>
          <p>Your test has been evaluated. Here are your results:</p>
          
          <div class="result-box">
            <h3>${test.title}</h3>
            <p><strong>Subject:</strong> ${test.subject}</p>
            <div class="score">${attempt.score} / ${test.totalMarks}</div>
            <span class="result-badge">${resultText}</span>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${attempt.percentage}%</div>
              <div class="stat-label">Percentage</div>
            </div>
            <div class="stat">
              <div class="stat-value">${attempt.accuracy}%</div>
              <div class="stat-label">Accuracy</div>
            </div>
            <div class="stat">
              <div class="stat-value">${attempt.correctAnswers}</div>
              <div class="stat-label">Correct</div>
            </div>
            <div class="stat">
              <div class="stat-value">${attempt.wrongAnswers}</div>
              <div class="stat-label">Wrong</div>
            </div>
            <div class="stat">
              <div class="stat-value">#${rank}</div>
              <div class="stat-label">Rank</div>
            </div>
            <div class="stat">
              <div class="stat-value">${totalParticipants}</div>
              <div class="stat-label">Participants</div>
            </div>
          </div>
          
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/student/results/${attempt._id}" class="button">View Detailed Result</a>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} GyanSagar Coaching Classes. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    GyanSagar Test Result — ${test.title}
    
    Dear ${student.name},
    
    Your test has been evaluated. Here are your results:
    
    Test: ${test.title}
    Subject: ${test.subject}
    Score: ${attempt.score} / ${test.totalMarks}
    Percentage: ${attempt.percentage}%
    Result: ${resultText}
    Accuracy: ${attempt.accuracy}%
    Correct: ${attempt.correctAnswers}
    Wrong: ${attempt.wrongAnswers}
    Rank: #${rank} / ${totalParticipants}
    
    View Detailed Result: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/student/results/${attempt._id}
    
    This is an automated email. Please do not reply.
    
    © ${new Date().getFullYear()} GyanSagar Coaching Classes. All rights reserved.
  `;

  return { html, text, subject: `GyanSagar Test Result — ${test.title}` };
}
