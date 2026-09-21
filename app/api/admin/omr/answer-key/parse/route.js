import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "../../../../../../lib/admin";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import { omrQuestionMap } from "../../../../../../lib/omr/attempt-bridge";

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let testId = "";
    let pastedText = "";
    let file = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      testId = formData.get("testId") || "";
      pastedText = formData.get("pastedText") || "";
      file = formData.get("file");
    } else {
      const body = await request.json();
      testId = body.testId || "";
      pastedText = body.pastedText || "";
    }

    if (!testId) {
      return NextResponse.json({ success: false, message: "testId is required." }, { status: 400 });
    }

    await connectToDatabase();
    const mapping = await omrQuestionMap(testId);
    const expectedCount = mapping.length;

    const parsedMap = {};
    const validOptions = new Set(["A", "B", "C", "D", "BLANK"]);

    let sourceName = "Manual Entry";

    // Scenario 1: Process Uploaded File (.xlsx, .xls, .csv)
    if (file) {
      sourceName = `Excel/CSV (${file.name})`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let workbook;
      try {
        workbook = XLSX.read(buffer, { type: "buffer" });
      } catch (err) {
        return NextResponse.json(
          { success: false, message: "Unable to parse spreadsheet file. Please upload a valid .xlsx, .xls, or .csv file." },
          { status: 400 }
        );
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: false, message: "Uploaded spreadsheet is empty." }, { status: 400 });
      }

      // Find header indices
      let qColIdx = 0;
      let ansColIdx = 1;

      // Inspect first 5 rows for header row
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i] || [];
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || "").trim().toLowerCase();
          if (["q", "q.no", "question", "question no", "question number", "no"].includes(val)) {
            qColIdx = c;
          }
          if (["ans", "answer", "correct answer", "option", "correct option"].includes(val)) {
            ansColIdx = c;
          }
        }
      }

      rows.forEach((row) => {
        if (!Array.isArray(row) || row.length === 0) return;

        const qRaw = String(row[qColIdx] || "").replace(/[^0-9]/g, "");
        const ansRaw = String(row[ansColIdx] || "").toUpperCase().trim();

        if (qRaw && ansRaw && ansRaw !== "ANSWER" && ansRaw !== "CORRECT ANSWER") {
          const qNum = parseInt(qRaw, 10);
          if (qNum > 0 && qNum <= expectedCount) {
            parsedMap[qNum] = ansRaw;
          }
        }
      });
    }
    // Scenario 2: Process Pasted Text
    else if (pastedText && pastedText.trim()) {
      sourceName = "Copied Text Import";
      const lines = pastedText.split(/[\r\n]+/);

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Matches formats like: "1-A", "1. A", "1:A", "1 A", "Q1: A"
        const match = trimmed.match(/^(?:Q|q)?\s*(\d+)[\s\-\:\.\,]+([a-dA-D]|blank|none)?$/i);
        if (match) {
          const qNum = parseInt(match[1], 10);
          const ans = (match[2] || "").toUpperCase();
          if (qNum > 0 && qNum <= expectedCount) {
            parsedMap[qNum] = ans;
          }
        }
      });
    }

    // Build complete preview list 1..N
    const preview = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let q = 1; q <= expectedCount; q++) {
      const rawAns = parsedMap[q] || "";
      const ans = rawAns.toUpperCase();

      let status = "Valid";
      let error = null;

      if (!ans) {
        status = "Missing";
        error = "Answer is missing";
        invalidCount++;
      } else if (!validOptions.has(ans)) {
        status = "Invalid";
        error = `Invalid answer "${rawAns}". Allowed: A, B, C, D, BLANK`;
        invalidCount++;
      } else {
        validCount++;
      }

      preview.push({
        questionOrder: q,
        answer: ans,
        status,
        error
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceName,
        totalQuestions: expectedCount,
        validCount,
        invalidCount,
        isComplete: invalidCount === 0,
        preview
      }
    });
  } catch (error) {
    console.error("Parse OMR Answer Key Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.code || "OMR_TEST_INVALID",
        message: error.message || "Failed to parse answer key.",
        details: error.details || null
      },
      { status: 400 }
    );
  }
}
