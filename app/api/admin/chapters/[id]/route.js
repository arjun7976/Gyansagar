import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Chapter from "../../../../../models/Chapter";
import Topic from "../../../../../models/Topic";
import { requireAdmin } from "../../../../../lib/admin";

export async function PUT(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectToDatabase();
    const body = await req.json();
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ success: false, message: "Name is required." }, { status: 400 });
    const chapter = await Chapter.findByIdAndUpdate(id, { name, description: body.description?.trim() || "" }, { new: true, runValidators: true });
    if (!chapter) return NextResponse.json({ success: false, message: "Chapter not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: chapter });
  } catch (e) {
    if (e.code === 11000) return NextResponse.json({ success: false, message: "A chapter with this name already exists in this subject." }, { status: 409 });
    return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectToDatabase();
    const { isActive } = await req.json();
    const chapter = await Chapter.findByIdAndUpdate(id, { isActive: Boolean(isActive) }, { new: true });
    if (!chapter) return NextResponse.json({ success: false, message: "Chapter not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: chapter });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectToDatabase();
    const topicCount = await Topic.countDocuments({ chapterId: id });
    if (topicCount > 0) return NextResponse.json({ success: false, message: `Cannot delete. This chapter has ${topicCount} topic(s). Delete them first.` }, { status: 409 });
    const chapter = await Chapter.findByIdAndDelete(id);
    if (!chapter) return NextResponse.json({ success: false, message: "Chapter not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Chapter deleted." });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
