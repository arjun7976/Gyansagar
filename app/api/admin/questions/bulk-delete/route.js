import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { requireAdmin } from "../../../../../lib/admin";
import Question from "../../../../../models/Question";
import TestQuestion from "../../../../../models/TestQuestion";

export async function DELETE(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Delete all questions
    const result = await Question.deleteMany({});
    
    // Also delete all test-question mappings to prevent broken references
    await TestQuestion.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `Successfully deleted all ${result.deletedCount} question(s) from the database.`
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete questions." },
      { status: 500 }
    );
  }
}
