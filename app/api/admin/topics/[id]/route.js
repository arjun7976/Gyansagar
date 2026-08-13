import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
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
    const topic = await Topic.findByIdAndUpdate(id, { name, description: body.description?.trim() || "" }, { new: true, runValidators: true });
    if (!topic) return NextResponse.json({ success: false, message: "Topic not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: topic });
  } catch (e) {
    if (e.code === 11000) return NextResponse.json({ success: false, message: "A topic with this name already exists in this chapter." }, { status: 409 });
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
    const topic = await Topic.findByIdAndUpdate(id, { isActive: Boolean(isActive) }, { new: true });
    if (!topic) return NextResponse.json({ success: false, message: "Topic not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: topic });
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
    const topic = await Topic.findByIdAndDelete(id);
    if (!topic) return NextResponse.json({ success: false, message: "Topic not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Topic deleted." });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
