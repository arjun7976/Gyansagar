import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { requireAdmin } from "../../../../../lib/admin";
import Test from "../../../../../models/Test";
import { omrQuestionMap } from "../../../../../lib/omr/attempt-bridge";

// GET: Fetch current OMR answer key configuration for a test
export async function GET(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId");

  if (!testId) {
    return NextResponse.json({ success: false, message: "testId is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const test = await Test.findOne({ _id: testId, isDeleted: { $ne: true } })
      .select("title subject omrConfig totalMarks")
      .lean();

    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found." }, { status: 404 });
    }

    const mapping = await omrQuestionMap(testId);
    const totalQuestions = mapping.length;

    const savedKeyMap = {};
    if (test.omrConfig?.answerKey) {
      test.omrConfig.answerKey.forEach((item) => {
        savedKeyMap[item.questionOrder] = item.answer;
      });
    }

    // Build full 1-N question list
    const answerKey = [];
    let isComplete = true;

    for (let q = 1; q <= totalQuestions; q++) {
      const ans = savedKeyMap[q] || "";
      if (!ans || !["A", "B", "C", "D", "BLANK"].includes(ans)) {
        isComplete = false;
      }
      answerKey.push({
        questionOrder: q,
        answer: ans,
        status: ans ? "Valid" : "Missing"
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        testId: test._id,
        testTitle: test.title,
        totalQuestions,
        isComplete,
        answerKey,
        updatedAt: test.omrConfig?.updatedAt || null
      }
    });
  } catch (error) {
    console.error("GET OMR Answer Key Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.code || "OMR_TEST_INVALID",
        message: error.message || "Failed to fetch answer key.",
        details: error.details || null
      },
      { status: 400 }
    );
  }
}

// POST: Save OMR answer key for a test (server-side validation)
export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { testId, answerKey } = body;

    if (!testId || !Array.isArray(answerKey)) {
      return NextResponse.json(
        { success: false, message: "testId and answerKey array are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const test = await Test.findOne({ _id: testId, isDeleted: { $ne: true } });
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found." }, { status: 404 });
    }

    const mapping = await omrQuestionMap(testId);
    const expectedCount = mapping.length;

    if (answerKey.length !== expectedCount) {
      return NextResponse.json(
        {
          success: false,
          message: `Answer key incomplete. Test requires exactly ${expectedCount} questions, but ${answerKey.length} answers were provided.`
        },
        { status: 400 }
      );
    }

    // Validate entries and questionOrder sequence 1..N
    const validOptions = new Set(["A", "B", "C", "D", "BLANK"]);
    const seenOrders = new Set();
    const cleanKey = [];

    for (const item of answerKey) {
      const qNum = Number(item.questionOrder);
      const ans = String(item.answer || "").toUpperCase().trim();

      if (!Number.isInteger(qNum) || qNum < 1 || qNum > expectedCount) {
        return NextResponse.json(
          { success: false, message: `Invalid question number ${item.questionOrder}. Must be between 1 and ${expectedCount}.` },
          { status: 400 }
        );
      }

      if (seenOrders.has(qNum)) {
        return NextResponse.json(
          { success: false, message: `Duplicate answer key entry for Question ${qNum}.` },
          { status: 400 }
        );
      }
      seenOrders.add(qNum);

      if (!ans) {
        return NextResponse.json(
          { success: false, message: `Question ${qNum} is missing an answer. Please specify A, B, C, D, or BLANK for all questions.` },
          { status: 400 }
        );
      }

      if (!validOptions.has(ans)) {
        return NextResponse.json(
          { success: false, message: `Question ${qNum} has invalid answer "${item.answer}". Allowed values are A, B, C, D, or BLANK.` },
          { status: 400 }
        );
      }

      cleanKey.push({
        questionOrder: qNum,
        answer: ans
      });
    }

    // Ensure all 1..N questions exist
    for (let q = 1; q <= expectedCount; q++) {
      if (!seenOrders.has(q)) {
        return NextResponse.json(
          { success: false, message: `Missing answer key for Question ${q}. All questions from 1 to ${expectedCount} are required.` },
          { status: 400 }
        );
      }
    }

    // Sort by questionOrder 1..N
    cleanKey.sort((a, b) => a.questionOrder - b.questionOrder);

    // Save to test omrConfig
    test.omrConfig = {
      answerKey: cleanKey,
      updatedAt: new Date()
    };
    await test.save();

    return NextResponse.json({
      success: true,
      message: `Answer key for "${test.title}" successfully saved (${cleanKey.length} questions valid).`,
      data: {
        testId: test._id,
        totalQuestions: cleanKey.length,
        updatedAt: test.omrConfig.updatedAt
      }
    });
  } catch (error) {
    console.error("POST OMR Answer Key Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.code || "OMR_TEST_INVALID",
        message: error.message || "Failed to save answer key.",
        details: error.details || null
      },
      { status: 400 }
    );
  }
}

// DELETE: Clear/Delete OMR answer key for a test
export async function DELETE(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId");

  if (!testId) {
    return NextResponse.json({ success: false, message: "testId is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const test = await Test.findOne({ _id: testId, isDeleted: { $ne: true } });
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found." }, { status: 404 });
    }

    test.omrConfig = {
      answerKey: [],
      sets: [],
      updatedAt: new Date()
    };
    await test.save();

    return NextResponse.json({
      success: true,
      message: `Answer key for "${test.title}" has been deleted. Previously evaluated student results are preserved.`
    });
  } catch (error) {
    console.error("DELETE OMR Answer Key Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete answer key."
      },
      { status: 500 }
    );
  }
}
