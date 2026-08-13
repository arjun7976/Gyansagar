import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import TestAttempt from "../../../../../../models/TestAttempt";
import mongoose from "mongoose";
import { getCurrentAdmin } from "../../../../../../lib/auth";

export async function GET(req, { params }) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectToDatabase();

    const pipeline = [
      {
        $match: {
          testId: new mongoose.Types.ObjectId(id),
          status: { $in: ["submitted", "auto_submitted"] }
        }
      },
      // Optional: If we want to only count unique participants, we should group by studentId first.
      // But usually "Total Participants" means distinct students, and averages are either per attempt or per best attempt.
      // We will group by studentId to find their best attempt first, to prevent a single student from skewing the class average by taking it 100 times.
      {
        $sort: { score: -1, accuracy: -1, timeTakenSeconds: 1 }
      },
      {
        $group: {
          _id: "$studentId",
          score: { $first: "$score" },
          percentage: { $first: "$percentage" },
          accuracy: { $first: "$accuracy" },
          timeTakenSeconds: { $first: "$timeTakenSeconds" },
          passed: { $first: "$passed" }
        }
      },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: 1 },
          averageScore: { $avg: "$score" },
          highestScore: { $max: "$score" },
          lowestScore: { $min: "$score" },
          averagePercentage: { $avg: "$percentage" },
          averageAccuracy: { $avg: "$accuracy" },
          averageTime: { $avg: "$timeTakenSeconds" },
          passCount: {
            $sum: { $cond: [{ $eq: ["$passed", true] }, 1, 0] }
          },
          failCount: {
            $sum: { $cond: [{ $eq: ["$passed", false] }, 1, 0] }
          }
        }
      }
    ];

    const result = await TestAttempt.aggregate(pipeline);

    if (!result || result.length === 0) {
      return NextResponse.json({
        success: true,
        analytics: {
          totalParticipants: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          averagePercentage: 0,
          averageAccuracy: 0,
          averageTime: 0,
          passCount: 0,
          failCount: 0
        }
      });
    }

    const data = result[0];
    // Format to 2 decimal places
    data.averageScore = data.averageScore ? Number(data.averageScore.toFixed(2)) : 0;
    data.averagePercentage = data.averagePercentage ? Number(data.averagePercentage.toFixed(2)) : 0;
    data.averageAccuracy = data.averageAccuracy ? Number(data.averageAccuracy.toFixed(2)) : 0;
    data.averageTime = data.averageTime ? Number(data.averageTime.toFixed(0)) : 0;

    return NextResponse.json({ success: true, analytics: data });
  } catch (error) {
    console.error("Admin Analytics API Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
