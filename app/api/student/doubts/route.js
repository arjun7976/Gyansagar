import { NextResponse } from "next/server";
import Doubt from "../../../../models/Doubt";
import { connectToDatabase } from "../../../../lib/mongodb";
import { currentStudent } from "../../../../lib/student-auth";

export async function GET(request) {
  try {
    const student = await currentStudent();
    if (!student) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const doubts = await Doubt.find({ studentId: student.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, doubts });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error fetching doubts" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const student = await currentStudent();
    if (!student) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { subject, question } = await request.json();
    if (!subject || !question) {
      return NextResponse.json({ success: false, message: "Subject and question are required" }, { status: 400 });
    }

    await connectToDatabase();
    const doubt = await Doubt.create({
      studentId: student.id,
      subject,
      question
    });

    return NextResponse.json({ success: true, doubt });
  } catch (error) {
    console.error("Doubt POST Error:", error);
    return NextResponse.json({ success: false, message: "Error creating doubt", error: error.message }, { status: 500 });
  }
}
