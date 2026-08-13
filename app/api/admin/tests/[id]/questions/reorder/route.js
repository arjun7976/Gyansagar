import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../../lib/mongodb";
import TestQuestion from "../../../../../../../models/TestQuestion";
import { requireAdmin } from "../../../../../../../lib/admin";

// PUT /api/admin/tests/[testId]/questions/reorder
// Body: { order: ["questionId1", "questionId2", ...] }
export async function PUT(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id: testId } = await params;
    await connectToDatabase();
    const { order } = await req.json();
    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ success: false, message: "Order array is required." }, { status: 400 });
    }
    const bulkOps = order.map((qId, idx) => ({
      updateOne: {
        filter: { testId, questionId: qId },
        update: { $set: { questionOrder: idx } }
      }
    }));
    await TestQuestion.bulkWrite(bulkOps);
    return NextResponse.json({ success: true, message: "Order updated." });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
