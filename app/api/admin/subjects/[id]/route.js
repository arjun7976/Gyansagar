import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Subject from "../../../../../models/Subject";
import Chapter from "../../../../../models/Chapter";
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
    const duplicate = await Subject.findOne({ name: { $regex: `^${name}$`, $options: "i" }, _id: { $ne: id } });
    if (duplicate) return NextResponse.json({ success: false, message: "A subject with this name already exists." }, { status: 409 });
    const subject = await Subject.findByIdAndUpdate(id, { name, description: body.description?.trim() || "", code: body.code?.trim() || "" }, { new: true, runValidators: true });
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: subject });
  } catch (e) {
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
    const subject = await Subject.findByIdAndUpdate(id, { isActive: Boolean(isActive) }, { new: true });
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: subject });
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
    const chapterCount = await Chapter.countDocuments({ subjectId: id });
    if (chapterCount > 0) return NextResponse.json({ success: false, message: `Cannot delete. This subject has ${chapterCount} chapter(s). Delete them first.` }, { status: 409 });
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Subject deleted." });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
