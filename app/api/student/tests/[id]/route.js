import { NextResponse } from "next/server";
import Test from "../../../../../models/Test";
import Question from "../../../../../models/Question";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { currentStudent } from "../../../../../lib/student-auth";

export async function GET(_, { params }) {
  try {
    const student = await currentStudent();
    const { id } = await params;
    
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    
    await connectToDatabase();
    
    const query = {
      _id: id,
      status: "published",
      isDeleted: { $ne: true },
      $or: [
        { visibility: { $ne: "specific" } },
        { visibility: "specific", assignedStudents: student._id }
      ]
    };
    
    const test = await Test.findOne(query).lean();
    
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found or unauthorized" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        ...test, 
        questionCount: await Question.countDocuments({ testId: id }) 
      } 
    });
  } catch (error) {
    console.error("Failed to load test:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}