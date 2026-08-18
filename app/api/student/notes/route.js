import { NextResponse } from "next/server";
import Note from "../../../../models/Note";
import { connectToDatabase } from "../../../../lib/mongodb";
import { currentStudent } from "../../../../lib/student-auth";

export async function GET(request) {
  try {
    const studentInfo = await currentStudent();
    if (!studentInfo) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    
    await connectToDatabase();
    
    // Only fetch active notes for students
    const notes = await Note.find({ isActive: true }).sort({ subject: 1, createdAt: -1 }).lean();
    
    // Group notes by subject
    const groupedNotes = notes.reduce((acc, note) => {
      if (!acc[note.subject]) {
        acc[note.subject] = [];
      }
      acc[note.subject].push(note);
      return acc;
    }, {});

    return NextResponse.json({ success: true, data: groupedNotes });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch study notes" }, { status: 500 });
  }
}
