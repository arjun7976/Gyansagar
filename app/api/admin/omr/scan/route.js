import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { omrQuestionMap } from "../../../../../lib/omr/attempt-bridge";
import { processOmrSheetScan } from "../../../../../lib/omr/detector";
import { evaluateOmrScanResults } from "../../../../../lib/omr/evaluator";
import Test from "../../../../../models/Test";

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const testId = formData.get("testId") || "";
    const set = (formData.get("set") || "A").toUpperCase().trim();
    const page = parseInt(formData.get("page") || "1", 10);
    const debugMode = formData.get("debugMode") || "CLASSIFICATION";

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided for scanning." }, { status: 400 });
    }

    let targetQuestionCount = 100;
    let loadedTest = null;
    let savedAnswerKeyList = null;

    if (testId) {
      try {
        await connectToDatabase();
        loadedTest = await Test.findOne({ _id: testId, isDeleted: { $ne: true } }).lean();
        if (loadedTest) {
          const mapping = await omrQuestionMap(testId);
          if (mapping && mapping.length > 0) {
            targetQuestionCount = mapping.length;
          }

          // Extract Answer Key for selected set
          if (loadedTest.omrConfig?.sets?.length) {
            const setObj = loadedTest.omrConfig.sets.find((s) => s.setName === set);
            if (setObj && setObj.answerKey?.length) {
              savedAnswerKeyList = setObj.answerKey;
            }
          }
          if (!savedAnswerKeyList && loadedTest.omrConfig?.answerKey?.length) {
            savedAnswerKeyList = loadedTest.omrConfig.answerKey;
          }
        }
      } catch (err) {
        console.warn("Could not load test mapping/answer key for scan count:", err.message);
      }
    }

    // Require Answer Key if testId is specified
    if (testId && (!savedAnswerKeyList || savedAnswerKeyList.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error_code: "ANSWER_KEY_NOT_FOUND",
          message: `Answer key not found for this examination and set (${set}).`
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    if (!imageBuffer || imageBuffer.length === 0) {
      return NextResponse.json({ success: false, message: "Uploaded OMR sheet file is empty." }, { status: 400 });
    }

    // Diagnostic logging
    const magicBytes = imageBuffer.slice(0, 8).toString("hex");
    console.log(
      JSON.stringify({
        stage: "file_upload_received",
        size: imageBuffer.length,
        mime_type: file.type || "unknown",
        magic_bytes: magicBytes,
        debug_mode: debugMode
      })
    );

    // Delegate to precision scanner
    const result = await processOmrSheetScan(imageBuffer, targetQuestionCount, page, debugMode);

    if (!result.success) {
      const isDecodeError = result.reason === "IMAGE_DECODE_FAILED";
      const statusCode = isDecodeError ? 400 : 422;

      return NextResponse.json(
        {
          success: false,
          error_code: result.reason || "REGISTRATION_CANDIDATES_INSUFFICIENT",
          message: result.message || "Could not process OMR sheet.",
          decode: result.decode || (isDecodeError ? "FAIL" : "PASS"),
          width: result.width,
          height: result.height,
          registration_candidates: result.registration_candidates ?? (result.details?.candidatesFound ?? 0),
          registration_detected: result.registration_detected || false,
          alignment_error_px: result.alignment_error_px,
          alignment_threshold_px: result.alignment_threshold_px || 15.0,
          perspective_correction: result.perspective_correction || "FAIL",
          details: result.details || {
            candidatesFound: 0,
            requiredMarks: 4,
            suggestion: "Please upload an uncropped, unskewed image showing all 4 corner registration marks."
          }
        },
        { status: statusCode }
      );
    }

    // Evaluate detected answers if answer key is loaded
    let evaluation = null;
    if (savedAnswerKeyList && savedAnswerKeyList.length > 0) {
      evaluation = evaluateOmrScanResults(result.answers, savedAnswerKeyList, {
        set,
        markingConfig: {
          correctMarks: 1,
          wrongMarks: loadedTest?.negativeMarks ? -Math.abs(loadedTest.negativeMarks) : 0,
          blankMarks: 0
        }
      });
    }

    // Return detailed production scanner payload matching exact requirement
    return NextResponse.json({
      success: true,
      page: result.page,
      decode: "PASS",
      width: result.width,
      height: result.height,
      registration_candidates: result.registration_candidates,
      registration_detected: result.registration_detected,
      alignment_error_px: result.alignment_error_px,
      alignment_threshold_px: result.alignment_threshold_px,
      perspective_correction: result.perspective_correction,
      canonicalWidth: 2480,
      canonicalHeight: 3508,
      templateAlignment: result.templateAlignment || { averageErrorPx: 0.0, maxErrorPx: 0.0, alignmentThresholdPx: 15.0, status: "PASS" },
      questions_detected: result.questions_detected,
      answered: result.answered,
      blank: result.blank,
      multiple: result.multiple,
      uncertain: result.uncertain,
      answers: result.answers,
      evaluation,
      debug_image: result.debug_image,
      diagnostics: result.diagnostics
    });
  } catch (error) {
    console.error("OMR Scanner API Execution Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process OMR scan." },
      { status: 500 }
    );
  }
}
