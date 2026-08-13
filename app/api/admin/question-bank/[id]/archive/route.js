import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import Question from "../../../../../../models/Question";
import { requireAdmin } from "../../../../../../lib/admin";

export async function PATCH(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectToDatabase();
    const question = await Question.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!question) return NextResponse.json({ success: false, message: "Question not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Question archived successfully.", data: question });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
