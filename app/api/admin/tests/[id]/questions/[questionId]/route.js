import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../../lib/mongodb";
import TestQuestion from "../../../../../../../models/TestQuestion";
import { requireAdmin } from "../../../../../../../lib/admin";

export async function DELETE(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id: testId, questionId } = await params;
    await connectToDatabase();
    const result = await TestQuestion.findOneAndDelete({ testId, questionId });
    if (!result) return NextResponse.json({ success: false, message: "Question not found in this test." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Question removed from test." });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
