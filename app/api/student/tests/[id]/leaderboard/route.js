import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import TestAttempt from "../../../../../../models/TestAttempt";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";

    // 1. Match only submitted attempts for this test
    const matchStage = {
      testId: new mongoose.Types.ObjectId(id),
      status: { $in: ["submitted", "auto_submitted"] }
    };
    if (filter === "passed") matchStage.passed = true;
    if (filter === "failed") matchStage.passed = false;

    // 2. Sort to get the best attempt per student (score desc, accuracy desc, time asc)
    // 3. Group by student to take only the first (best) attempt
    // 4. Sort again to establish final ranking order
    // 5. Use setWindowFields for competition rank
    // 6. Lookup student details
    
    const pipeline = [
      { $match: matchStage },
      { 
        $sort: { 
          score: -1, 
          accuracy: -1, 
          timeTakenSeconds: 1, 
          submittedAt: 1 
        } 
      },
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
      { 
        $sort: { 
          score: -1, 
          accuracy: -1, 
          timeTakenSeconds: 1, 
          submittedAt: 1 
        } 
      },
      {
        $setWindowFields: {
          sortBy: { 
            score: -1, 
            accuracy: -1, 
            timeTakenSeconds: 1,
            submittedAt: 1
          },
          output: {
            rank: {
              $denseRank: {}
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },
      {
        $project: {
          _id: 0,
          rank: 1,
          score: 1,
          percentage: 1,
          accuracy: 1,
          timeTakenSeconds: 1,
          studentName: "$student.name"
        }
      }
    ];

    const leaderboard = await TestAttempt.aggregate(pipeline);

    return NextResponse.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return NextResponse.json({ success: false, message: "Error loading leaderboard" }, { status: 500 });
  }
}
