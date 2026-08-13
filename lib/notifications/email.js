import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (!transporter && process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    throw new Error("Email transporter not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD environment variables.");
  }

  try {
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || "GyanSagar Test System <noreply@gyansagar.com>",
      to,
      subject,
      html,
      text
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}

export function isEmailConfigured() {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}
