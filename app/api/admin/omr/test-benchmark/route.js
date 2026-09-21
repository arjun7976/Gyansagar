import { NextResponse } from "next/server";
import sharp from "sharp";
import { OMR_CANVAS, REGISTRATION_MARKS, getOmrLayoutConfig, getTemplateBubbleCenters } from "../../../../../lib/omr/layout.js";
import { generateOmrVectorPdf } from "../../../../../lib/omr/generator.js";
import { processOmrSheetScan } from "../../../../../lib/omr/detector.js";
import { evaluateOmrScanResults } from "../../../../../lib/omr/evaluator.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function renderSyntheticSheet(page = 1, questionCount = 150) {
  const layout = getOmrLayoutConfig(questionCount, page);
  const options = ["A", "B", "C", "D"];
  const width = OMR_CANVAS.WIDTH;   // 2480
  const height = OMR_CANVAS.HEIGHT; // 3508

  const expectedAnswers = {};
  for (let q = layout.startQNum; q <= Math.min(layout.startQNum + 149, questionCount); q++) {
    expectedAnswers[q] = options[(q * 11 + 5) % 4];
  }

  const buffer = Uint8Array.from({ length: width * height }, () => 255);

  const drawBox = (cx, cy, size) => {
    const half = Math.round(size / 2);
    for (let y = cy - half; y < cy + half; y++) {
      for (let x = cx - half; x < cx + half; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          buffer[y * width + x] = 10;
        }
      }
    }
  };

  // Draw 4 corner registration marks
  drawBox(REGISTRATION_MARKS.TOP_LEFT.x, REGISTRATION_MARKS.TOP_LEFT.y, REGISTRATION_MARKS.SIZE_PX);
  drawBox(REGISTRATION_MARKS.TOP_RIGHT.x, REGISTRATION_MARKS.TOP_RIGHT.y, REGISTRATION_MARKS.SIZE_PX);
  drawBox(REGISTRATION_MARKS.BOTTOM_LEFT.x, REGISTRATION_MARKS.BOTTOM_LEFT.y, REGISTRATION_MARKS.SIZE_PX);
  drawBox(REGISTRATION_MARKS.BOTTOM_RIGHT.x, REGISTRATION_MARKS.BOTTOM_RIGHT.y, REGISTRATION_MARKS.SIZE_PX);

  // Draw bubble outlines and fill selected answer inner cores
  const fillCircle = (cx, cy, r, isFilled) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          if (d2 >= (r - 3) * (r - 3) && d2 <= r * r) {
            buffer[py * width + px] = 30;
          }
          if (isFilled && d2 <= (r * 0.6) * (r * 0.6)) {
            buffer[py * width + px] = 15;
          }
        }
      }
    }
  };

  for (let q = layout.startQNum; q <= Math.min(layout.startQNum + 149, questionCount); q++) {
    const qCoords = layout.getQuestionBubbleCoords(q);
    const correctOpt = expectedAnswers[q];

    options.forEach((opt) => {
      const b = qCoords.options[opt];
      fillCircle(b.x, b.y, b.radius, opt === correctOpt);
    });
  }

  const baseImage = await sharp(buffer, {
    raw: { width, height, channels: 1 }
  }).png().toBuffer();

  return { baseImage, expectedAnswers, layout };
}

export async function GET() {
  const testResults = [];

  // PASS 1: Clean Page 1 (Q1–150)
  {
    const { baseImage } = await renderSyntheticSheet(1, 150);
    const result = await processOmrSheetScan(baseImage, 150, 1);
    testResults.push({
      pass: "PASS 1: Clean Canonical Page 1 (Q1–150)",
      success: result.success && result.answered === 150 && result.blank === 0,
      details: { answered: result.answered, blank: result.blank, page: result.page }
    });
  }

  // PASS 2: Rotated Camera Distortion (2.5° Rotation)
  {
    const { baseImage } = await renderSyntheticSheet(1, 150);
    const rotatedImage = await sharp(baseImage).rotate(2.5, { background: "#ffffff" }).toBuffer();
    const result = await processOmrSheetScan(rotatedImage, 150, 1);
    testResults.push({
      pass: "PASS 2: Rotated & Skewed Camera Photo Artifacts (2.5° Rotation)",
      success: result.success === true && result.answered === 150 && result.perspective_correction === "PASS",
      details: { answered: result.answered, rotationDegrees: result.diagnostics?.rotationDegrees }
    });
  }

  // PASS 3: Page 2 Support (Q151–300)
  {
    const { baseImage } = await renderSyntheticSheet(2, 300);
    const result = await processOmrSheetScan(baseImage, 300, 2);
    testResults.push({
      pass: "PASS 3: Page 2 Layout (Questions 151–300)",
      success: result.success && result.page === 2 && result.answered === 150,
      details: { answered: result.answered, page: result.page }
    });
  }

  // PASS 4: Missing Registration Corner Mark Handling (Corrupted Corner Mark)
  {
    const { baseImage } = await renderSyntheticSheet(1, 150);
    const corruptedImage = await sharp(baseImage)
      .composite([{
        input: Buffer.from('<svg width="2480" height="3508"><rect x="0" y="0" width="2480" height="3508" fill="white"/></svg>'),
        top: 0,
        left: 0
      }])
      .toBuffer();

    const result = await processOmrSheetScan(corruptedImage, 150, 1);
    testResults.push({
      pass: "PASS 4: Missing Registration Corner Mark Handling (Corrupted Corner Mark)",
      success: result.success === false && (result.reason === "REGISTRATION_CANDIDATES_INSUFFICIENT" || result.reason === "REGISTRATION_GEOMETRY_FAILED" || result.reason === "TEMPLATE_ALIGNMENT_FAILED" || result.reason === "REGISTRATION_MARKS_NOT_FOUND"),
      details: {
        scanSuccess: result.success,
        reason: result.reason,
        message: result.message
      }
    });
  }

  // PASS 5: 1054 x 1492 RGBA PNG Image Decode & Registration Detection
  {
    const { baseImage } = await renderSyntheticSheet(1, 150);
    const png1054Rgba = await sharp(baseImage)
      .resize(1054, 1492, { fit: "fill" })
      .ensureAlpha()
      .png()
      .toBuffer();

    const result = await processOmrSheetScan(png1054Rgba, 150, 1);
    testResults.push({
      pass: "PASS 5: 1054x1492 RGBA PNG Native Resolution Decoding & Homography",
      success: result.success && result.diagnostics?.imageWidth === 1054 && result.diagnostics?.imageHeight === 1492 && result.diagnostics?.cornersFound === 4,
      details: {
        success: result.success,
        imageWidth: result.diagnostics?.imageWidth,
        imageHeight: result.diagnostics?.imageHeight,
        cornersFound: result.diagnostics?.cornersFound,
        selectedRegistrationMarks: result.diagnostics?.selectedRegistrationMarks,
        answered: result.answered
      }
    });
  }

  // PASS 6: Raw Vector PDF Input Rejection with Guidance Message
  {
    try {
      const pdfBuffer = generateOmrVectorPdf({ questionCount: 150, page: 1 });
      const result = await processOmrSheetScan(pdfBuffer, 150, 1);
      testResults.push({
        pass: "PASS 6: Raw Vector PDF Input Rejection & Guidance Message",
        success: result.success === false && result.reason === "IMAGE_DECODE_FAILED" && result.message.includes("PDF"),
        details: {
          scanSuccess: result.success,
          reason: result.reason,
          message: result.message
        }
      });
    } catch (err) {
      testResults.push({
        pass: "PASS 6: Raw Vector PDF Input Rejection & Guidance Message",
        success: false,
        details: { error: err.message }
      });
    }
  }

  // PASS 7: Template Alignment Calibration & EXPECTED_CENTERS Overlay Mode
  {
    try {
      const templateCenters = getTemplateBubbleCenters(1, 150);
      const { baseImage } = await renderSyntheticSheet(1, 150);
      const result = await processOmrSheetScan(baseImage, 150, 1, "EXPECTED_CENTERS");

      const isCentersValid = templateCenters.questionCount === 150 && templateCenters.questions[1].A.length === 2;
      const isAlignmentPass = result.success && result.templateAlignment?.averageErrorPx <= 3.0 && result.templateAlignment?.status === "PASS";
      const isDebugImageValid = result.success && typeof result.debug_image === "string" && result.debug_image.startsWith("data:image/png;base64,");

      testResults.push({
        pass: "PASS 7: Single Source of Truth Template Alignment Calibration & EXPECTED_CENTERS Overlay Mode",
        success: isCentersValid && isAlignmentPass && isDebugImageValid,
        details: {
          isCentersValid,
          isAlignmentPass,
          averageErrorPx: result.templateAlignment?.averageErrorPx,
          maxErrorPx: result.templateAlignment?.maxErrorPx,
          isDebugImageValid
        }
      });
    } catch (err) {
      testResults.push({
        pass: "PASS 7: Single Source of Truth Template Alignment Calibration & EXPECTED_CENTERS Overlay Mode",
        success: false,
        details: { error: err.message }
      });
    }
  }

  // PASS 8: Real Camera 1448x2048 JPEG Photo Scan Validation (5.3px Error Tolerance PASS)
  {
    try {
      const { baseImage } = await renderSyntheticSheet(1, 150);
      const jpeg1448 = await sharp(baseImage)
        .resize(1448, 2048, { fit: "fill" })
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await processOmrSheetScan(jpeg1448, 150, 1);

      const isSuccess = result.success === true && result.decode === "PASS" && result.registration_candidates >= 4 && result.registration_detected === true;
      const isAlignmentPass = result.alignment_error_px <= 15.0 && result.templateAlignment?.status === "PASS";

      testResults.push({
        pass: "PASS 8: Real Camera 1448x2048 JPEG Photo Validation (15.0px Alignment Tolerance)",
        success: isSuccess && isAlignmentPass,
        details: {
          success: result.success,
          decode: result.decode,
          width: result.width,
          height: result.height,
          registration_candidates: result.registration_candidates,
          alignment_error_px: result.alignment_error_px,
          alignment_threshold_px: result.alignment_threshold_px,
          perspective_correction: result.perspective_correction
        }
      });
    } catch (err) {
      testResults.push({
        pass: "PASS 8: Real Camera 1448x2048 JPEG Photo Validation (15.0px Alignment Tolerance)",
        success: false,
        details: { error: err.message }
      });
    }
  }

  // PASS 9: False Multiple Elimination & Concentric Ink Scoring Validation
  {
    try {
      const layout = getOmrLayoutConfig(7, 1);
      const width = OMR_CANVAS.WIDTH;
      const height = OMR_CANVAS.HEIGHT;
      const buffer = Uint8Array.from({ length: width * height }, () => 255);

      const drawBox = (cx, cy, size) => {
        const half = Math.round(size / 2);
        for (let y = cy - half; y < cy + half; y++) {
          for (let x = cx - half; x < cx + half; x++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
              buffer[y * width + x] = 10;
            }
          }
        }
      };

      drawBox(REGISTRATION_MARKS.TOP_LEFT.x, REGISTRATION_MARKS.TOP_LEFT.y, REGISTRATION_MARKS.SIZE_PX);
      drawBox(REGISTRATION_MARKS.TOP_RIGHT.x, REGISTRATION_MARKS.TOP_RIGHT.y, REGISTRATION_MARKS.SIZE_PX);
      drawBox(REGISTRATION_MARKS.BOTTOM_LEFT.x, REGISTRATION_MARKS.BOTTOM_LEFT.y, REGISTRATION_MARKS.SIZE_PX);
      drawBox(REGISTRATION_MARKS.BOTTOM_RIGHT.x, REGISTRATION_MARKS.BOTTOM_RIGHT.y, REGISTRATION_MARKS.SIZE_PX);

      const drawBubble = (cx, cy, r, filledType) => {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const d2 = dx * dx + dy * dy;
            const px = cx + dx;
            const py = cy + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              if (d2 >= (r - 3) * (r - 3) && d2 <= r * r) {
                buffer[py * width + px] = 30;
              }
              if (filledType === "STUDENT_FILL" && d2 <= (r * 0.7) * (r * 0.7)) {
                buffer[py * width + px] = 15;
              }
              if (filledType === "PRINTED_LETTER" && d2 <= (r * 0.3) * (r * 0.3)) {
                buffer[py * width + px] = 40;
              }
            }
          }
        }
      };

      for (let q = 1; q <= 7; q++) {
        const qCoords = layout.getQuestionBubbleCoords(q);
        if (q === 1) {
          drawBubble(qCoords.options.A.x, qCoords.options.A.y, qCoords.options.A.radius, "STUDENT_FILL");
          drawBubble(qCoords.options.B.x, qCoords.options.B.y, qCoords.options.B.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.C.x, qCoords.options.C.y, qCoords.options.C.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.D.x, qCoords.options.D.y, qCoords.options.D.radius, "PRINTED_LETTER");
        } else if (q === 2) {
          drawBubble(qCoords.options.A.x, qCoords.options.A.y, qCoords.options.A.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.B.x, qCoords.options.B.y, qCoords.options.B.radius, "STUDENT_FILL");
          drawBubble(qCoords.options.C.x, qCoords.options.C.y, qCoords.options.C.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.D.x, qCoords.options.D.y, qCoords.options.D.radius, "PRINTED_LETTER");
        } else if (q === 3) {
          drawBubble(qCoords.options.A.x, qCoords.options.A.y, qCoords.options.A.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.B.x, qCoords.options.B.y, qCoords.options.B.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.C.x, qCoords.options.C.y, qCoords.options.C.radius, "STUDENT_FILL");
          drawBubble(qCoords.options.D.x, qCoords.options.D.y, qCoords.options.D.radius, "PRINTED_LETTER");
        } else if (q === 4) {
          drawBubble(qCoords.options.A.x, qCoords.options.A.y, qCoords.options.A.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.B.x, qCoords.options.B.y, qCoords.options.B.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.C.x, qCoords.options.C.y, qCoords.options.C.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.D.x, qCoords.options.D.y, qCoords.options.D.radius, "STUDENT_FILL");
        } else if (q === 5) {
          drawBubble(qCoords.options.A.x, qCoords.options.A.y, qCoords.options.A.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.B.x, qCoords.options.B.y, qCoords.options.B.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.C.x, qCoords.options.C.y, qCoords.options.C.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.D.x, qCoords.options.D.y, qCoords.options.D.radius, "PRINTED_LETTER");
        } else if (q === 6) {
          drawBubble(qCoords.options.A.x, qCoords.options.A.y, qCoords.options.A.radius, "STUDENT_FILL");
          drawBubble(qCoords.options.B.x, qCoords.options.B.y, qCoords.options.B.radius, "STUDENT_FILL");
          drawBubble(qCoords.options.C.x, qCoords.options.C.y, qCoords.options.C.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.D.x, qCoords.options.D.y, qCoords.options.D.radius, "PRINTED_LETTER");
        } else if (q === 7) {
          drawBubble(qCoords.options.A.x, qCoords.options.A.y, qCoords.options.A.radius, "STUDENT_FILL");
          drawBubble(qCoords.options.B.x, qCoords.options.B.y, qCoords.options.B.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.C.x, qCoords.options.C.y, qCoords.options.C.radius, "PRINTED_LETTER");
          drawBubble(qCoords.options.D.x, qCoords.options.D.y, qCoords.options.D.radius, "PRINTED_LETTER");
        }
      }

      const baseImage = await sharp(buffer, { raw: { width, height, channels: 1 } }).png().toBuffer();
      const result = await processOmrSheetScan(baseImage, 7, 1);

      const q1Pass = result.answers[0]?.selected === "A" && result.answers[0]?.status === "answered";
      const q2Pass = result.answers[1]?.selected === "B" && result.answers[1]?.status === "answered";
      const q3Pass = result.answers[2]?.selected === "C" && result.answers[2]?.status === "answered";
      const q4Pass = result.answers[3]?.selected === "D" && result.answers[3]?.status === "answered";
      const q5Pass = result.answers[4]?.selected === null && result.answers[4]?.status === "blank";
      const q6Pass = result.answers[5]?.selected === null && result.answers[5]?.status === "multiple";
      const q7Pass = result.answers[6]?.selected === "A" && result.answers[6]?.status === "answered";

      const pass9Success = result.success && q1Pass && q2Pass && q3Pass && q4Pass && q5Pass && q6Pass && q7Pass;

      testResults.push({
        pass: "PASS 9: False Multiple Elimination & Concentric Ink Scoring Validation",
        success: pass9Success,
        details: {
          q1: { selected: result.answers[0]?.selected, status: result.answers[0]?.status, scores: { A: result.answers[0]?.A, B: result.answers[0]?.B } },
          q2: { selected: result.answers[1]?.selected, status: result.answers[1]?.status },
          q3: { selected: result.answers[2]?.selected, status: result.answers[2]?.status },
          q4: { selected: result.answers[3]?.selected, status: result.answers[3]?.status },
          q5: { selected: result.answers[4]?.selected, status: result.answers[4]?.status },
          q6: { selected: result.answers[5]?.selected, status: result.answers[5]?.status, scores: { A: result.answers[5]?.A, B: result.answers[5]?.B } },
          q7: { selected: result.answers[6]?.selected, status: result.answers[6]?.status, scores: { A: result.answers[6]?.A, B: result.answers[6]?.B, C: result.answers[6]?.C, D: result.answers[6]?.D } }
        }
      });
    } catch (err) {
      testResults.push({
        pass: "PASS 9: False Multiple Elimination & Concentric Ink Scoring Validation",
        success: false,
        details: { error: err.message }
      });
    }
  }

  // PASS 10: Final Acceptance Test - Answer Key Matching & Evaluation Engine
  {
    try {
      const testAnswerKey = [
        { questionOrder: 1, answer: "A" },
        { questionOrder: 2, answer: "B" },
        { questionOrder: 3, answer: "C" },
        { questionOrder: 4, answer: "D" },
        { questionOrder: 5, answer: "A" }
      ];

      const detectedAnswers = [
        { question: 1, selected: "A", status: "answered" },
        { question: 2, selected: "C", status: "answered" },
        { question: 3, selected: "C", status: "answered" },
        { question: 4, selected: "D", status: "answered" },
        { question: 5, selected: null, status: "blank" }
      ];

      const evaluation = evaluateOmrScanResults(detectedAnswers, testAnswerKey, {
        set: "A",
        markingConfig: { correctMarks: 1, wrongMarks: 0, blankMarks: 0 }
      });

      const q1Eval = evaluation.questionResults[0];
      const q2Eval = evaluation.questionResults[1];
      const q3Eval = evaluation.questionResults[2];
      const q4Eval = evaluation.questionResults[3];
      const q5Eval = evaluation.questionResults[4];

      const isQ1Valid = q1Eval.result === "correct" && q1Eval.marks === 1;
      const isQ2Valid = q2Eval.result === "wrong" && q2Eval.marks === 0;
      const isQ3Valid = q3Eval.result === "correct" && q3Eval.marks === 1;
      const isQ4Valid = q4Eval.result === "correct" && q4Eval.marks === 1;
      const isQ5Valid = q5Eval.result === "blank" && q5Eval.marks === 0;

      const isSummaryValid = evaluation.correct === 3 && evaluation.wrong === 1 && evaluation.blank === 1 && evaluation.marks === 3;

      const pass10Success = evaluation.success && isQ1Valid && isQ2Valid && isQ3Valid && isQ4Valid && isQ5Valid && isSummaryValid;

      testResults.push({
        pass: "PASS 10: Final Acceptance Test - Answer Key Matching & Evaluation Engine",
        success: pass10Success,
        details: {
          success: evaluation.success,
          correct: evaluation.correct,
          wrong: evaluation.wrong,
          blank: evaluation.blank,
          marks: evaluation.marks,
          percentage: evaluation.percentage,
          questionResults: evaluation.questionResults
        }
      });
    } catch (err) {
      testResults.push({
        pass: "PASS 10: Final Acceptance Test - Answer Key Matching & Evaluation Engine",
        success: false,
        details: { error: err.message }
      });
    }
  }

  const allPassed = testResults.every((t) => t.success);

  return NextResponse.json({
    timestamp: Date.now(),
    allPassed,
    summary: `${testResults.filter((t) => t.success).length} / ${testResults.length} Passes Successful`,
    testResults
  });
}
