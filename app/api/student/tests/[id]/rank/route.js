import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import TestAttempt from "../../../../../../models/TestAttempt";
import mongoose from "mongoose";
import { currentStudent } from "../../../../../../lib/student-auth";

export async function GET(req, { params }) {
  try {
    const student = await currentStudent();
    if (!student) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectToDatabase();

    const leaderboard = await TestAttempt.aggregate([
      { 
        $match: { 
          testId: new mongoose.Types.ObjectId(id),
          status: { $in: ["submitted", "auto_submitted"] }
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
        $group: {
          _id: "$studentId",
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
      }
    ]);
    
    const totalParticipants = leaderboard.length;
    const myIndex = leaderboard.findIndex(entry => entry._id.toString() === student.id);
    const myEntry = myIndex !== -1 ? leaderboard[myIndex] : null;

    if (!myEntry) {
      return NextResponse.json({ 
        success: false, 
        message: "You haven't submitted this test yet." 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      rank: myIndex + 1,
      totalParticipants,
      score: myEntry.score,
      percentage: myEntry.percentage
    });
  } catch (error) {
    console.error("Rank API Error:", error);
    return NextResponse.json({ success: false, message: "Error calculating rank" }, { status: 500 });
  }
}
