import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Topic from "../../../../models/Topic";
import { requireAdmin } from "../../../../lib/admin";

export async function GET(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const chapterId = searchParams.get("chapterId");
    const subjectId = searchParams.get("subjectId");
    const onlyActive = searchParams.get("active") === "true";
    const filter = {};
    if (chapterId) filter.chapterId = chapterId;
    if (subjectId) filter.subjectId = subjectId;
    if (onlyActive) filter.isActive = true;
    const topics = await Topic.find(filter).populate("subjectId", "name").populate("chapterId", "name").sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: topics });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const body = await req.json();
    const name = body.name?.trim();
    const chapterId = body.chapterId?.trim();
    const subjectId = body.subjectId?.trim();
    if (!name || !chapterId || !subjectId) return NextResponse.json({ success: false, message: "Name, Chapter, and Subject are required." }, { status: 400 });
    const topic = await Topic.create({ subjectId, chapterId, name, description: body.description?.trim() || "" });
    return NextResponse.json({ success: true, data: topic }, { status: 201 });
  } catch (e) {
    if (e.code === 11000) return NextResponse.json({ success: false, message: "A topic with this name already exists in this chapter." }, { status: 409 });
    return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  }
}
