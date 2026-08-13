import NotificationLog from "../../models/NotificationLog";
import { sendEmail } from "./email";
import { sendWhatsAppMessage } from "./whatsapp";
import { getWelcomeEmailTemplate } from "./templates/welcome";
import { getResultEmailTemplate } from "./templates/result";
import { getCertificateEmailTemplate } from "./templates/certificate";
import { getResultWhatsAppTemplate } from "./templates/result-whatsapp";
import { getCertificateWhatsAppTemplate } from "./templates/certificate-whatsapp";

const MAX_RETRY_ATTEMPTS = 3;

export async function createNotificationJob({ userId, type, channel, recipient, referenceId, data = {} }) {
  try {
    const log = await NotificationLog.create({
      userId,
      type,
      channel,
      recipient,
      referenceId,
      status: "pending"
    });
    return log;
  } catch (error) {
    console.error("Failed to create notification job:", error);
    throw error;
  }
}

export async function processNotification(log) {
  if (log.status !== "pending" && log.status !== "failed") {
    return { success: false, message: "Notification already processed" };
  }

  if (log.retryCount >= MAX_RETRY_ATTEMPTS) {
    await NotificationLog.findByIdAndUpdate(log._id, {
      status: "failed",
      errorMessage: "Max retry attempts exceeded"
    });
    return { success: false, message: "Max retry attempts exceeded" };
  }

  try {
    let result;

    switch (log.type) {
      case "welcome":
        result = await processWelcomeNotification(log);
        break;
      case "result":
        result = await processResultNotification(log);
        break;
      case "certificate":
        result = await processCertificateNotification(log);
        break;
      default:
        throw new Error(`Unknown notification type: ${log.type}`);
    }

    await NotificationLog.findByIdAndUpdate(log._id, {
      status: "sent",
      sentAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error(`Failed to process notification ${log._id}:`, error);
    
    await NotificationLog.findByIdAndUpdate(log._id, {
      status: "failed",
      errorMessage: error.message,
      retryCount: log.retryCount + 1
    });

    return { success: false, message: error.message };
  }
}

async function processWelcomeNotification(log) {
  const User = require("../../models/User").default;
  const user = await User.findById(log.userId);
  if (!user) throw new Error("User not found");

  if (log.channel === "email") {
    const template = getWelcomeEmailTemplate(user);
    return await sendEmail({
      to: log.recipient,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } else if (log.channel === "whatsapp") {
    const message = `Welcome to GyanSagar Test System, ${user.name}! Your account has been created successfully. Go to dashboard: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/student`;
    return await sendWhatsAppMessage({ to: log.recipient, message });
  }
}

async function processResultNotification(log) {
  const User = require("../../models/User").default;
  const TestAttempt = require("../../models/TestAttempt").default;
  const Test = require("../../models/Test").default;

  const [user, attempt, test] = await Promise.all([
    User.findById(log.userId),
    TestAttempt.findById(log.referenceId).populate("testId"),
    null
  ]);

  if (!user || !attempt) throw new Error("User or attempt not found");
  const testDoc = attempt.testId || await Test.findById(attempt.testId);
  if (!testDoc) throw new Error("Test not found");

  // Calculate rank
  const rank = await calculateRank(attempt);
  const totalParticipants = await TestAttempt.countDocuments({
    testId: attempt.testId,
    status: { $in: ["submitted", "auto_submitted"] }
  });

  if (log.channel === "email") {
    const template = getResultEmailTemplate(user, testDoc, attempt, rank, totalParticipants);
    return await sendEmail({
      to: log.recipient,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } else if (log.channel === "whatsapp") {
    const message = getResultWhatsAppTemplate(user, testDoc, attempt, rank, totalParticipants);
    return await sendWhatsAppMessage({ to: log.recipient, message });
  }
}

async function processCertificateNotification(log) {
  const User = require("../../models/User").default;
  const Certificate = require("../../models/Certificate").default;
  const Test = require("../../models/Test").default;

  const [user, certificate, test] = await Promise.all([
    User.findById(log.userId),
    Certificate.findById(log.referenceId).populate("testId"),
    null
  ]);

  if (!user || !certificate) throw new Error("User or certificate not found");
  const testDoc = certificate.testId || await Test.findById(certificate.testId);
  if (!testDoc) throw new Error("Test not found");

  if (log.channel === "email") {
    const template = getCertificateEmailTemplate(user, testDoc, certificate);
    return await sendEmail({
      to: log.recipient,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } else if (log.channel === "whatsapp") {
    const message = getCertificateWhatsAppTemplate(user, testDoc, certificate);
    return await sendWhatsAppMessage({ to: log.recipient, message });
  }
}

async function calculateRank(attempt) {
  const TestAttempt = require("../../models/TestAttempt").default;
  const higherScores = await TestAttempt.countDocuments({
    testId: attempt.testId,
    status: { $in: ["submitted", "auto_submitted"] },
    score: { $gt: attempt.score }
  });
  return higherScores + 1;
}

export async function processPendingNotifications(limit = 10) {
  const pendingLogs = await NotificationLog.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(limit);

  const results = [];
  for (const log of pendingLogs) {
    const result = await processNotification(log);
    results.push({ logId: log._id, ...result });
  }

  return results;
}
