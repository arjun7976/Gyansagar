import Certificate from "../models/Certificate";
import crypto from "crypto";
import { createNotificationJob } from "./notifications/queue";

export function generateCertificateId() {
  const year = new Date().getFullYear();
  const randomBytes = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `GS-${year}-${randomBytes}`;
}

export async function createCertificateIfEligible(attempt, test, student) {
  // Check if certificate is enabled for this test
  if (!test.enableCertificate) {
    return null;
  }

  // Check if student meets the percentage threshold
  if (attempt.percentage < test.certificateMinPercentage) {
    return null;
  }

  // Check if certificate already exists for this attempt
  const existing = await Certificate.findOne({ attemptId: attempt._id });
  if (existing) {
    return existing;
  }

  // Calculate rank
  const TestAttempt = require("../models/TestAttempt").default;
  const higherScores = await TestAttempt.countDocuments({
    testId: attempt.testId,
    status: { $in: ["submitted", "auto_submitted"] },
    score: { $gt: attempt.score }
  });
  const rank = higherScores + 1;

  // Generate certificate
  const certificateId = generateCertificateId();
  const certificate = await Certificate.create({
    certificateId,
    studentId: student._id,
    testId: test._id,
    attemptId: attempt._id,
    percentage: attempt.percentage,
    rank,
    issuedAt: new Date(),
    status: "valid"
  });

  // Create certificate notification jobs (non-blocking)
  if (student) {
    // Certificate email notification
    if (test.emailNotifications?.certificate && student.email) {
      createNotificationJob({
        userId: student._id,
        type: "certificate",
        channel: "email",
        recipient: student.email,
        referenceId: certificate._id
      }).catch(err => console.error("Certificate email notification job failed:", err));
    }
    // Certificate WhatsApp notification
    if (test.whatsappNotifications?.certificate && student.mobile) {
      createNotificationJob({
        userId: student._id,
        type: "certificate",
        channel: "whatsapp",
        recipient: student.mobile,
        referenceId: certificate._id
      }).catch(err => console.error("Certificate WhatsApp notification job failed:", err));
    }
  }

  return certificate;
}

export async function revokeCertificate(certificateId) {
  const certificate = await Certificate.findOne({ certificateId });
  if (!certificate) {
    throw new Error("Certificate not found");
  }

  certificate.status = "revoked";
  await certificate.save();

  return certificate;
}
