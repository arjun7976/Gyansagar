/**
 * GyanSagar OMR System - Deterministic Vector PDF & SVG Template Generator
 * Programmatically generates printable vector PDF/SVG A4 OMR templates.
 * NO AI generated images — 100% vector geometry matching canonical layout.
 */

import { jsPDF } from "jspdf";
import sharp from "sharp";
import { getOmrLayoutConfig, REGISTRATION_MARKS, OPTIONS_LIST, OMR_CANVAS, GRID_CONFIG } from "./layout";

/**
 * Generate a deterministic vector PDF buffer for A4 printing at 100% scale
 */
export function generateOmrVectorPdf({ questionCount = 100, page = 1, examTitle = "GyanSagar Examination" }) {
  const pageNum = Number(page) === 2 ? 2 : 1;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const layout = getOmrLayoutConfig(questionCount, pageNum);

  // 1. Draw 4 Solid Black Registration Square Markers at Exact mm Coordinates
  doc.setFillColor(0, 0, 0);
  const markSize = REGISTRATION_MARKS.SIZE_MM; // 10mm
  const halfSize = markSize / 2; // 5mm

  // Corners centered at (15,15), (195,15), (15,282), (195,282)
  doc.rect(REGISTRATION_MARKS.TOP_LEFT.mmX - halfSize, REGISTRATION_MARKS.TOP_LEFT.mmY - halfSize, markSize, markSize, "F");
  doc.rect(REGISTRATION_MARKS.TOP_RIGHT.mmX - halfSize, REGISTRATION_MARKS.TOP_RIGHT.mmY - halfSize, markSize, markSize, "F");
  doc.rect(REGISTRATION_MARKS.BOTTOM_LEFT.mmX - halfSize, REGISTRATION_MARKS.BOTTOM_LEFT.mmY - halfSize, markSize, markSize, "F");
  doc.rect(REGISTRATION_MARKS.BOTTOM_RIGHT.mmX - halfSize, REGISTRATION_MARKS.BOTTOM_RIGHT.mmY - halfSize, markSize, markSize, "F");

  // 2. Header Graphics
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("OMR ANSWER SHEET", 105, 18, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Exam: ${examTitle}`, 25, 25);
  doc.text(`Template: OMR_TEMPLATE_V1 • Page ${pageNum} of 2`, 185, 25, { align: "right" });

  doc.setFontSize(8);
  doc.text("Student Name: _______________________________  Roll No: _____________  Set: ____", 25, 31);
  doc.setFont("helvetica", "bold");
  doc.text("IMPORTANT: Print at 100% / Actual Size. Do NOT use 'Fit to Page' or scaling.", 105, 37, { align: "center" });

  doc.setLineWidth(0.3);
  doc.line(25, 39, 185, 39);

  // 3. Questions & Vector Option Bubbles
  const optionSpacingMm = GRID_CONFIG.optionSpacingMm;

  for (let c = 0; c < layout.totalCols; c++) {
    const colCenterX = GRID_CONFIG.colCentersMm[c];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Q.", colCenterX - 18, 48);
    OPTIONS_LIST.forEach((opt, idx) => {
      const headerOptMm = colCenterX - (1.5 * optionSpacingMm) + (idx * optionSpacingMm);
      doc.text(opt, headerOptMm, 48, { align: "center" });
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setLineWidth(0.25);

  const bubbleRadiusMm = GRID_CONFIG.bubbleRadiusMm;

  for (let q = layout.startQNum; q <= layout.endQNum; q++) {
    const coords = layout.getQuestionBubbleCoords(q);
    const colCenterX = GRID_CONFIG.colCentersMm[coords.colIdx];

    // Question number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(String(q), colCenterX - 18, coords.options.A.mmY + 0.8, { align: "right" });

    // 4 Vector Circular Bubbles
    OPTIONS_LIST.forEach((opt) => {
      const b = coords.options[opt];
      doc.setDrawColor(0, 0, 0);
      doc.circle(b.mmX, b.mmY, bubbleRadiusMm, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(opt, b.mmX, b.mmY + 0.6, { align: "center" });
    });
  }

  // 4. Footer Graphics
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Date: ____________", 25, 287);
  doc.text("Student Signature: ____________________", 185, 287, { align: "right" });

  const pdfArrayBuffer = doc.output("arraybuffer");
  return Buffer.from(pdfArrayBuffer);
}

/**
 * Generate a high-resolution 300 DPI PNG OMR Template Image Buffer
 */
export async function generateOmrPngImage({ questionCount = 100, page = 1, examTitle = "GyanSagar Examination" }) {
  const pageNum = Number(page) === 2 ? 2 : 1;
  const layout = getOmrLayoutConfig(questionCount, pageNum);

  const width = OMR_CANVAS.WIDTH;   // 2480
  const height = OMR_CANVAS.HEIGHT; // 3508
  const buffer = new Uint8Array(width * height);
  buffer.fill(255);

  const drawSquare = (cx, cy, sizePx) => {
    const half = Math.round(sizePx / 2);
    for (let y = cy - half; y < cy + half; y++) {
      for (let x = cx - half; x < cx + half; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          buffer[y * width + x] = 10;
        }
      }
    }
  };

  drawSquare(REGISTRATION_MARKS.TOP_LEFT.x, REGISTRATION_MARKS.TOP_LEFT.y, REGISTRATION_MARKS.SIZE_PX);
  drawSquare(REGISTRATION_MARKS.TOP_RIGHT.x, REGISTRATION_MARKS.TOP_RIGHT.y, REGISTRATION_MARKS.SIZE_PX);
  drawSquare(REGISTRATION_MARKS.BOTTOM_LEFT.x, REGISTRATION_MARKS.BOTTOM_LEFT.y, REGISTRATION_MARKS.SIZE_PX);
  drawSquare(REGISTRATION_MARKS.BOTTOM_RIGHT.x, REGISTRATION_MARKS.BOTTOM_RIGHT.y, REGISTRATION_MARKS.SIZE_PX);

  const drawCircleOutline = (cx, cy, r) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          if (d2 >= (r - 3) * (r - 3) && d2 <= r * r) {
            buffer[py * width + px] = 30;
          }
        }
      }
    }
  };

  for (let q = layout.startQNum; q <= layout.endQNum; q++) {
    const coords = layout.getQuestionBubbleCoords(q);
    OPTIONS_LIST.forEach((opt) => {
      const b = coords.options[opt];
      drawCircleOutline(b.x, b.y, b.radius);
    });
  }

  const sharpInst = sharp(buffer, {
    raw: { width, height, channels: 1 }
  });

  return await sharpInst.png().toBuffer();
}
