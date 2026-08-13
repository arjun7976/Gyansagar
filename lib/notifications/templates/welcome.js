export function getWelcomeEmailTemplate(student) {
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
          <h2>Welcome to GyanSagar Test System!</h2>
          <p>Dear <strong>${student.name}</strong>,</p>
          <p>We are pleased to welcome you to the GyanSagar Test System. Your account has been successfully created.</p>
          <p>You can now:</p>
          <ul>
            <li>Take online tests</li>
            <li>View your results</li>
            <li>Track your performance</li>
            <li>Download certificates</li>
          </ul>
          <p>If you have any questions, feel free to contact us.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/student" class="button">Go to Dashboard</a>
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
    Welcome to GyanSagar Test System!
    
    Dear ${student.name},
    
    We are pleased to welcome you to the GyanSagar Test System. Your account has been successfully created.
    
    You can now:
    - Take online tests
    - View your results
    - Track your performance
    - Download certificates
    
    Go to Dashboard: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/student
    
    This is an automated email. Please do not reply.
    
    © ${new Date().getFullYear()} GyanSagar Coaching Classes. All rights reserved.
  `;

  return { html, text, subject: "Welcome to GyanSagar Test System" };
}
