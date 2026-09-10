import { NextResponse } from "next/server";
import Test from "../../../../models/Test";
import { connectToDatabase } from "../../../../lib/mongodb";
import { currentStudent } from "../../../../lib/student-auth";

export async function GET() {
  try {
    const student = await currentStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tests = await Test.aggregate([
      { 
        $match: { 
          status: "published", 
          isDeleted: { $ne: true },
          $or: [
            { visibility: { $ne: "specific" } },
            { visibility: "specific", assignedStudents: student._id }
          ]
        } 
      },
      { 
        $lookup: { 
          from: "questions", 
          localField: "_id", 
          foreignField: "testId", 
          as: "q" 
        } 
      },
      { 
        $addFields: { 
          questionCount: { $size: "$q" } 
        } 
      },
      { 
        $project: { 
          q: 0 
        } 
      }
    ]);

    return NextResponse.json({ success: true, data: tests });
  } catch (error) {
    console.error("Failed to load tests:", error);
    return NextResponse.json({ success: false, message: "Unable to load tests" }, { status: 500 });
  }
}