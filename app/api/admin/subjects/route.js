import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Subject from "../../../../models/Subject";
import { requireAdmin } from "../../../../lib/admin";

export async function GET(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get("active") === "true";
    const filter = onlyActive ? { isActive: true } : {};
    const subjects = await Subject.find(filter).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: subjects });
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
    if (!name) return NextResponse.json({ success: false, message: "Subject name is required." }, { status: 400 });
    const existing = await Subject.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (existing) return NextResponse.json({ success: false, message: "A subject with this name already exists." }, { status: 409 });
    const subject = await Subject.create({ name, description: body.description?.trim() || "", code: body.code?.trim() || "", createdBy: admin.userId });
    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  }
}
