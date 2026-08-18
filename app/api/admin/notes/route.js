import { NextResponse } from "next/server";
import Note from "../../../../models/Note";
import { connectToDatabase } from "../../../../lib/mongodb";
import { requireAdmin } from "../../../../lib/admin";

export async function GET(request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject")?.trim();
    const filter = {};
    if (subject) filter.subject = subject;

    const notes = await Note.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminInfo = await requireAdmin();
    if (!adminInfo) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    
    const body = await request.json();
    const { title, subject, content, fileUrl, isActive } = body;
    
    if (!title || !subject) {
      return NextResponse.json({ success: false, message: "Title and subject are required" }, { status: 400 });
    }

    await connectToDatabase();
    
    const note = await Note.create({
      title: title.trim(),
      subject: subject.trim(),
      content: content?.trim() || "",
      fileUrl: fileUrl?.trim() || "",
      isActive: isActive !== false,
      createdBy: adminInfo.userId
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to create note" }, { status: 500 });
  }
}
