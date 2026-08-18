import { NextResponse } from "next/server";
import Test from "../../../../../../models/Test";
import TestAttempt from "../../../../../../models/TestAttempt";
import User from "../../../../../../models/User";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import { isObjectId, requireAdmin } from "../../../../../../lib/admin";
import { generateCertificateId } from "../../../../../../lib/certificate";
import Certificate from "../../../../../../models/Certificate";
import { createNotificationJob } from "../../../../../../lib/notifications/queue";

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    if (!await requireAdmin()) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid test id" }, { status: 400 });
    
    const { status } = await request.json();
    if (!["draft", "published", "closed"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid test status" }, { status: 400 });
    }
    
    await connectToDatabase();
    
    const oldTest = await Test.findById(id);
    if (!oldTest) return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    
    const test = await Test.findByIdAndUpdate(id, { status }, { new: true });
    
    // Generate Top 3 Certificates if closed
    if (status === "closed" && oldTest.status !== "closed" && test.enableCertificate) {
      await generateTop3Certificates(test);
    }
    
    return NextResponse.json({ success: true, data: test });
  } catch (error) {
    console.error("Test status update error:", error);
    return NextResponse.json({ success: false, message: "Unable to update test status" }, { status: 500 });
  }
}

async function generateTop3Certificates(test) {
  try {
    const leaderboard = await TestAttempt.aggregate([
      { $match: { testId: test._id, status: { $in: ["submitted", "auto_submitted"] } } },
      { $sort: { score: -1, accuracy: -1, timeTakenSeconds: 1, submittedAt: 1 } },
      {
        $group: {
          _id: "$studentId",
          attemptId: { $first: "$_id" },
          score: { $first: "$score" },
          percentage: { $first: "$percentage" },
          accuracy: { $first: "$accuracy" },
          timeTakenSeconds: { $first: "$timeTakenSeconds" },
          submittedAt: { $first: "$submittedAt" }
        }
      },
      { $sort: { score: -1, accuracy: -1, timeTakenSeconds: 1, submittedAt: 1 } },
      { $limit: 3 }
    ]);

    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const rank = i + 1;
      
      // Skip if they didn't meet min percentage
      if (entry.percentage < test.certificateMinPercentage) continue;
      
      // Check if they already have one
      const existing = await Certificate.findOne({ attemptId: entry.attemptId });
      if (existing) continue;

      const student = await User.findById(entry._id);
      if (!student) continue;

      const certificateId = generateCertificateId();
      const certificate = await Certificate.create({
        certificateId,
        studentId: student._id,
        testId: test._id,
        attemptId: entry.attemptId,
        percentage: entry.percentage,
        rank,
        issuedAt: new Date(),
        status: "valid"
      });

      if (test.emailNotifications?.certificate && student.email) {
        createNotificationJob({
          userId: student._id,
          type: "certificate",
          channel: "email",
          recipient: student.email,
          referenceId: certificate._id
        }).catch(err => console.error(err));
      }

      if (test.whatsappNotifications?.certificate && student.mobile) {
        createNotificationJob({
          userId: student._id,
          type: "certificate",
          channel: "whatsapp",
          recipient: student.mobile,
          referenceId: certificate._id
        }).catch(err => console.error(err));
      }
    }
  } catch (err) {
    console.error("Failed generating Top 3 certificates:", err);
  }
}