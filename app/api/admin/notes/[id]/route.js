import { NextResponse } from "next/server";
import Note from "../../../../../models/Note";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { requireAdmin, isObjectId } from "../../../../../lib/admin";

export async function PUT(request, { params }) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { title, subject, content, fileUrl, isActive } = body;
    
    if (!title || !subject) {
      return NextResponse.json({ success: false, message: "Title and subject are required" }, { status: 400 });
    }

    await connectToDatabase();
    
    const note = await Note.findByIdAndUpdate(id, {
      title: title.trim(),
      subject: subject.trim(),
      content: content?.trim() || "",
      fileUrl: fileUrl?.trim() || "",
      isActive: isActive !== false
    }, { new: true });

    if (!note) return NextResponse.json({ success: false, message: "Note not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

    await connectToDatabase();
    const result = await Note.findByIdAndDelete(id);
    
    if (!result) return NextResponse.json({ success: false, message: "Note not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to delete note" }, { status: 500 });
  }
}
