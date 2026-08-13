export function getCertificateWhatsAppTemplate(student, test, certificate) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const message = `
*GYANSAGAR TEST SYSTEM*
ज्ञानसागर कोचिंग क्लासेज

🎉 *Congratulations!* 🎉

You have successfully completed the test and earned a certificate!

*Certificate of Achievement*

*Student:* ${student.name}
*Test:* ${test.title}
*Score:* ${certificate.percentage}%
*Certificate ID:* ${certificate.certificateId}

View and download your certificate:
${baseUrl}/student/certificates

Verify your certificate:
${baseUrl}/verify-certificate?certificateId=${certificate.certificateId}

---
This is an automated message.
© ${new Date().getFullYear()} GyanSagar Coaching Classes
  `.trim();

  return message;
}
