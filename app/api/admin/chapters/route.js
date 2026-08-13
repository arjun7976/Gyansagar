import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Chapter from "../../../../models/Chapter";
import { requireAdmin } from "../../../../lib/admin";

export async function GET(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const onlyActive = searchParams.get("active") === "true";
    const filter = {};
    if (subjectId) filter.subjectId = subjectId;
    if (onlyActive) filter.isActive = true;
    const chapters = await Chapter.find(filter).populate("subjectId", "name").sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: chapters });
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
    const subjectId = body.subjectId?.trim();
    if (!name || !subjectId) return NextResponse.json({ success: false, message: "Name and Subject are required." }, { status: 400 });
    const chapter = await Chapter.create({ subjectId, name, description: body.description?.trim() || "" });
    return NextResponse.json({ success: true, data: chapter }, { status: 201 });
  } catch (e) {
    if (e.code === 11000) return NextResponse.json({ success: false, message: "A chapter with this name already exists in this subject." }, { status: 409 });
    return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  }
}
