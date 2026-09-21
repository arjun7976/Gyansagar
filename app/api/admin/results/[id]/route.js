import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { requireAdmin } from "../../../../../lib/admin";
import TestAttempt from "../../../../../models/TestAttempt";

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    const attempt = await TestAttempt.findById(id)
      .populate("studentId", "name email mobile batch")
      .populate("testId", "title subject totalMarks passingPercentage")
      .lean();

    if (!attempt) {
      return NextResponse.json({ success: false, message: "Attempt result not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, attempt });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch attempt details." },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    const deletedAttempt = await TestAttempt.findByIdAndDelete(id);

    if (!deletedAttempt) {
      return NextResponse.json({ success: false, message: "Attempt result not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Student test result deleted successfully."
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete attempt result." },
      { status: 500 }
    );
  }
}
