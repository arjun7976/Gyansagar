import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import Question from "../../../../../../models/Question";
import { requireAdmin } from "../../../../../../lib/admin";

export async function POST(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectToDatabase();
    const original = await Question.findById(id).lean();
    if (!original) return NextResponse.json({ success: false, message: "Question not found." }, { status: 404 });
    const { _id, createdAt, updatedAt, __v, ...rest } = original;
    const duplicate = await Question.create({ ...rest, createdBy: admin.userId });
    return NextResponse.json({ success: true, data: duplicate }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
