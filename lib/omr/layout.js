/**
 * GyanSagar OMR System - Single Source of Truth Layout & Geometry Specification
 * Canonical Canvas: 2480 x 3508 pixels (A4 @ 300 DPI)
 * Physical Dimensions: 210mm x 297mm
 * Scale Factor: 300 / 25.4 = 11.811023622047244 px/mm
 */

export const OMR_CANVAS = {
  WIDTH: 2480,
  HEIGHT: 3508,
  DPI: 300,
  MM_WIDTH: 210,
  MM_HEIGHT: 297,
  DPI_SCALE: 300 / 25.4, // 11.811023622047244 px/mm
  PX_TO_MM: 25.4 / 300,  // 0.08466666666666667 mm/px
  MAX_ALIGNMENT_ERROR_PX: 15.0, // Absolute threshold relaxed for real camera photos (15.0px)
  NORMALIZED_ALIGNMENT_TOLERANCE: 0.01 // 1.0% normalized tolerance relative to canonical canvas width
};

export function mmToPx(mm) {
  return Math.round(mm * OMR_CANVAS.DPI_SCALE);
}

export function pxToMm(px) {
  return px * OMR_CANVAS.PX_TO_MM;
}

// 4 Corner Solid Black Registration Marker Centers & Size (Physical MM & 300 DPI PX)
export const REGISTRATION_MARKS = {
  SIZE_MM: 10.0,
  SIZE_PX: mmToPx(10.0), // ~118px square
  TOP_LEFT: { x: mmToPx(15.0), y: mmToPx(15.0), mmX: 15.0, mmY: 15.0 },
  TOP_RIGHT: { x: mmToPx(195.0), y: mmToPx(15.0), mmX: 195.0, mmY: 15.0 },
  BOTTOM_LEFT: { x: mmToPx(15.0), y: mmToPx(282.0), mmX: 15.0, mmY: 282.0 },
  BOTTOM_RIGHT: { x: mmToPx(195.0), y: mmToPx(282.0), mmX: 195.0, mmY: 282.0 }
};

export const OPTIONS_LIST = ["A", "B", "C", "D"];

export const GRID_CONFIG = {
  gridTopMm: 52.0,      // Top Y of question grid in MM
  gridBottomMm: 272.0,  // Bottom Y of question grid in MM
  questionsPerCol: 50,  // 50 rows per column
  colCentersMm: [42.0, 105.0, 168.0], // Centers of Col 1, Col 2, Col 3 in MM
  optionSpacingMm: 9.0, // 9.0mm spacing between option bubbles A, B, C, D
  bubbleRadiusMm: 2.5,  // 2.5mm outer radius (~30px at 300 DPI)
  interiorRadiusMm: 1.375 // 1.375mm inner core radius (~16px at 300 DPI, 0.55R)
};

/**
 * Single source of truth layout calculator for 300 DPI canonical space
 * Page 1: Q1 to Q150
 * Page 2: Q151 to Q300
 */
export function getOmrLayoutConfig(questionCount = 100, page = 1) {
  const count = Number(questionCount) || 100;
  const pageNum = Number(page) === 2 ? 2 : 1;
  const startQNum = pageNum === 2 ? 151 : 1;
  const endQNum = pageNum === 1 ? Math.min(count, 150) : Math.min(count, 300);

  const questionsPerCol = GRID_CONFIG.questionsPerCol; // 50
  const activeQuestionsOnPage = endQNum - startQNum + 1;
  const totalCols = activeQuestionsOnPage <= 50 ? 1 : activeQuestionsOnPage <= 100 ? 2 : 3;

  const gridTopYPx = mmToPx(GRID_CONFIG.gridTopMm);      // ~614px
  const gridBottomYPx = mmToPx(GRID_CONFIG.gridBottomMm); // ~3213px
  const gridHeightMm = GRID_CONFIG.gridBottomMm - GRID_CONFIG.gridTopMm; // 220mm
  const rowHeightMm = gridHeightMm / questionsPerCol; // 4.40mm per row
  const rowHeightPx = rowHeightMm * OMR_CANVAS.DPI_SCALE; // ~51.97px per row

  const colCentersPx = GRID_CONFIG.colCentersMm.map((mm) => mmToPx(mm)); // [496, 1240, 1984]
  const optionSpacingPx = mmToPx(GRID_CONFIG.optionSpacingMm); // ~106px
  const bubbleRadiusPx = mmToPx(GRID_CONFIG.bubbleRadiusMm);   // ~30px
  const interiorRadiusPx = mmToPx(GRID_CONFIG.interiorRadiusMm); // ~16px

  const getQuestionBubbleCoords = (qNum) => {
    const q = Number(qNum);
    // Local 0-based question index on this page (0 to 149)
    const localIdx = q >= startQNum ? q - startQNum : Math.max(0, q - 1);
    const colIdx = Math.floor(localIdx / questionsPerCol);
    const rowIdx = localIdx % questionsPerCol;

    const rowYMm = GRID_CONFIG.gridTopMm + (rowIdx * rowHeightMm) + (rowHeightMm * 0.5);
    const rowYPx = Math.round(rowYMm * OMR_CANVAS.DPI_SCALE);

    const colCenterX = colCentersPx[Math.min(colIdx, 2)];
    const colCenterXMm = GRID_CONFIG.colCentersMm[Math.min(colIdx, 2)];

    const bubbleBaseX = colCenterXMm - (1.5 * GRID_CONFIG.optionSpacingMm);

    const options = {};
    OPTIONS_LIST.forEach((opt, idx) => {
      const optMmX = bubbleBaseX + (idx * GRID_CONFIG.optionSpacingMm);
      const optPxX = Math.round(optMmX * OMR_CANVAS.DPI_SCALE);

      options[opt] = {
        opt,
        mmX: Number(optMmX.toFixed(2)),
        mmY: Number(rowYMm.toFixed(2)),
        x: optPxX,
        y: rowYPx,
        radiusMm: GRID_CONFIG.bubbleRadiusMm,
        radius: bubbleRadiusPx,
        interiorRadius: interiorRadiusPx
      };
    });

    return {
      qNum: q,
      localIdx,
      colIdx,
      rowIdx,
      centerMm: { x: colCenterXMm, y: Number(rowYMm.toFixed(2)) },
      centerPx: { x: colCenterX, y: rowYPx },
      options
    };
  };

  return {
    questionCount: count,
    page: pageNum,
    startQNum,
    endQNum,
    totalCols,
    questionsPerCol,
    gridTopY: gridTopYPx,
    gridTopMm: GRID_CONFIG.gridTopMm,
    rowHeight: rowHeightPx,
    rowHeightMm,
    colCenters: colCentersPx,
    colCentersMm: GRID_CONFIG.colCentersMm,
    bubbleRadius: bubbleRadiusPx,
    interiorRadius: interiorRadiusPx,
    getQuestionBubbleCoords
  };
}

/**
 * Returns structured expected bubble centers for calibration verification
 */
export function getTemplateBubbleCenters(page = 1, questionCount = 150) {
  const layout = getOmrLayoutConfig(questionCount, page);
  const questions = {};

  for (let q = layout.startQNum; q <= layout.endQNum; q++) {
    const coords = layout.getQuestionBubbleCoords(q);
    questions[q] = {
      qNum: q,
      A: [coords.options.A.x, coords.options.A.y],
      B: [coords.options.B.x, coords.options.B.y],
      C: [coords.options.C.x, coords.options.C.y],
      D: [coords.options.D.x, coords.options.D.y],
      radius: coords.options.A.radius,
      centerMm: coords.centerMm,
      centerPx: coords.centerPx
    };
  }

  return {
    page: layout.page,
    canonicalWidth: OMR_CANVAS.WIDTH,
    canonicalHeight: OMR_CANVAS.HEIGHT,
    startQNum: layout.startQNum,
    endQNum: layout.endQNum,
    questionCount: Object.keys(questions).length,
    questions
  };
}
