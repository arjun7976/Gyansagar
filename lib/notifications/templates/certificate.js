export function getCertificateEmailTemplate(student, test, certificate) {
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
        .certificate-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b; }
        .certificate-title { font-size: 24px; font-weight: bold; color: #92400e; margin-bottom: 15px; }
        .student-name { font-size: 28px; font-weight: bold; color: #2563eb; margin: 15px 0; }
        .test-name { font-size: 18px; color: #4b5563; }
        .score { font-size: 36px; font-weight: bold; color: #16a34a; margin: 15px 0; }
        .certificate-id { font-size: 12px; color: #6b7280; margin-top: 15px; }
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
          <h2>🎉 Congratulations!</h2>
          <p>Dear <strong>${student.name}</strong>,</p>
          <p>You have successfully completed the test and earned a certificate!</p>
          
          <div class="certificate-box">
            <div class="certificate-title">CERTIFICATE OF ACHIEVEMENT</div>
            <div class="student-name">${student.name}</div>
            <div class="test-name">${test.title}</div>
            <div class="score">${certificate.percentage}%</div>
            <div class="certificate-id">Certificate ID: ${certificate.certificateId}</div>
          </div>
          
          <p>You can download your certificate from your dashboard or verify it using the certificate ID.</p>
          
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/student/certificates" class="button">View Certificates</a>
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
    🎉 Congratulations! Certificate Issued
    
    Dear ${student.name},
    
    You have successfully completed the test and earned a certificate!
    
    Certificate of Achievement
    Student: ${student.name}
    Test: ${test.title}
    Score: ${certificate.percentage}%
    Certificate ID: ${certificate.certificateId}
    
    You can download your certificate from your dashboard or verify it using the certificate ID.
    
    View Certificates: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/student/certificates
    
    This is an automated email. Please do not reply.
    
    © ${new Date().getFullYear()} GyanSagar Coaching Classes. All rights reserved.
  `;

  return { html, text, subject: "🎉 Certificate Issued — GyanSagar Test System" };
}
