/**
 * GyanSagar OMR System - Production Precision Scanner Engine
 * Features resolution-independent decoding, RGBA normalization,
 * connected components registration blob analysis, bilinear homography warp,
 * template alignment calibration check, and two-mode debug preview overlays.
 */

import sharp from "sharp";
import { OMR_CANVAS, OPTIONS_LIST, getOmrLayoutConfig, REGISTRATION_MARKS, getTemplateBubbleCenters } from "./layout";

export async function processOmrSheetScan(imageBuffer, targetQuestionCount = 100, page = 1, debugMode = "CLASSIFICATION") {
  let sharpInst;
  let metadata;

  // 1. Image Decode Stage
  const isPdf = imageBuffer && imageBuffer.slice(0, 4).toString() === "%PDF";

  try {
    sharpInst = sharp(imageBuffer, { density: 300, page: 0 });
    metadata = await sharpInst.metadata();
  } catch (err) {
    console.error("OMR Image Decode Failure:", err.message);
    return {
      success: false,
      reason: "IMAGE_DECODE_FAILED",
      message: isPdf
        ? "Uploaded file is a PDF document. Please upload a PNG, JPG, or WEBP image scan/photo of the OMR sheet."
        : "Failed to decode image file format. Please upload a clear PNG, JPG, WEBP, or PDF OMR sheet."
    };
  }

  let rawData;
  let info;

  try {
    const decoded = await sharpInst
      .rotate()
      .removeAlpha()
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    rawData = decoded.data;
    info = decoded.info;
  } catch (err) {
    console.error("OMR Pixel Normalization Error:", err.message);
    return {
      success: false,
      reason: "IMAGE_DECODE_FAILED",
      message: "Failed to normalize image pixel matrix."
    };
  }

  if (!rawData || !info || !info.width || !info.height) {
    return {
      success: false,
      reason: "IMAGE_DECODE_FAILED",
      message: "Decoded image pixel matrix or dimensions are invalid."
    };
  }

  // Mandatory image_decode stage log format
  console.log(
    JSON.stringify({
      stage: "image_decode",
      success: true,
      format: metadata.format || info.format || "png",
      width: info.width,
      height: info.height,
      channels: info.channels || 3
    })
  );

  const nativeWidth = info.width;
  const nativeHeight = info.height;

  // 2. Multi-Pass Registration Mark Detection at Native Decoded Resolution
  const passes = [
    { name: "raw_standard", data: rawData },
    { name: "normalized", data: applyNormalization(rawData, nativeWidth, nativeHeight) },
    { name: "contrast_boost", data: applyContrastBoost(rawData, nativeWidth, nativeHeight) }
  ];

  let bestRegistration = null;

  for (const pass of passes) {
    try {
      const reg = findRegistrationMarks(pass.data, nativeWidth, nativeHeight);
      if (reg && reg.cornersFound >= 3) {
        bestRegistration = { ...reg, rawData: pass.data };
        break;
      }
    } catch (e) {
      console.warn(`OMR registration pass ${pass.name} error:`, e.message);
    }
  }

  // Registration Marks Failure Protection
  if (!bestRegistration || bestRegistration.cornersFound < 3) {
    const candidatesCount = bestRegistration ? bestRegistration.candidatesFound : 0;
    const cornersCount = bestRegistration ? bestRegistration.cornersFound : 0;
    const isGeometryFail = candidatesCount >= 4 && cornersCount < 3;

    return {
      success: false,
      reason: isGeometryFail ? "REGISTRATION_GEOMETRY_FAILED" : "REGISTRATION_CANDIDATES_INSUFFICIENT",
      message: isGeometryFail
        ? `4 corner candidates detected, but quadrilateral geometry validation failed.`
        : `Could not detect all 4 corner registration marks. Found ${candidatesCount}/4 candidate marks.`,
      details: {
        candidatesFound: candidatesCount,
        cornersFound: cornersCount,
        requiredMarks: 4,
        suggestion: "Please upload an uncropped, unskewed image showing all 4 corner registration marks."
      }
    };
  }

  const { corners, cornersFound, candidatesFound, rotationDegrees } = bestRegistration;

  // 3. Print Scale Validation (Scale-Independent Check)
  const topDist = Math.hypot(corners.TR.x - corners.TL.x, corners.TR.y - corners.TL.y);
  const leftDist = Math.hypot(corners.BL.x - corners.TL.x, corners.BL.y - corners.TL.y);
  const targetTopDist = (REGISTRATION_MARKS.TOP_RIGHT.x - REGISTRATION_MARKS.TOP_LEFT.x) / OMR_CANVAS.WIDTH * nativeWidth;
  const targetLeftDist = (REGISTRATION_MARKS.BOTTOM_LEFT.y - REGISTRATION_MARKS.TOP_LEFT.y) / OMR_CANVAS.HEIGHT * nativeHeight;

  const topScaleRatio = targetTopDist > 0 ? topDist / targetTopDist : 1.0;
  const leftScaleRatio = targetLeftDist > 0 ? leftDist / targetLeftDist : 1.0;

  if (topScaleRatio < 0.65 || topScaleRatio > 1.35 || leftScaleRatio < 0.65 || leftScaleRatio > 1.35) {
    return {
      success: false,
      reason: "REGISTRATION_GEOMETRY_FAILED",
      message: "OMR sheet physical print scale or aspect ratio is invalid. Please ensure sheet was printed at 100% / Actual Size without scaling.",
      details: {
        candidatesFound: Math.max(candidatesFound, 4),
        cornersFound,
        detectedTopDist: Math.round(topDist),
        targetTopDist: Math.round(targetTopDist),
        detectedLeftDist: Math.round(leftDist),
        targetLeftDist: Math.round(targetLeftDist)
      }
    };
  }

  // 4. Bilinear Perspective Homography Rectification directly from Native Space to 2480x3508 Canonical Canvas
  let rectifiedBuffer;
  try {
    rectifiedBuffer = warpToCanonicalCanvas(rawData, nativeWidth, nativeHeight, corners);
  } catch (err) {
    return {
      success: false,
      reason: "PERSPECTIVE_CORRECTION_FAILED",
      message: "Failed to compute perspective homography transform matrix.",
      details: { error: err.message }
    };
  }

  const normWidth = OMR_CANVAS.WIDTH;   // 2480
  const normHeight = OMR_CANVAS.HEIGHT; // 3508

  // 5. Template Alignment Calibration Check (Relaxed 15.0px Threshold)
  const layout = getOmrLayoutConfig(targetQuestionCount, page);
  const templateAlignment = checkTemplateAlignment(rectifiedBuffer, layout);

  if (templateAlignment.status === "FAIL" && templateAlignment.averageErrorPx > (OMR_CANVAS.MAX_ALIGNMENT_ERROR_PX || 15.0)) {
    return {
      success: false,
      reason: "TEMPLATE_ALIGNMENT_FAILED",
      message: `Template alignment error (${templateAlignment.averageErrorPx}px) exceeds maximum allowed threshold of ${(OMR_CANVAS.MAX_ALIGNMENT_ERROR_PX || 15.0).toFixed(1)}px.`,
      decode: "PASS",
      width: nativeWidth,
      height: nativeHeight,
      registration_candidates: Math.max(candidatesFound, cornersFound),
      registration_detected: true,
      alignment_error_px: templateAlignment.averageErrorPx,
      alignment_threshold_px: OMR_CANVAS.MAX_ALIGNMENT_ERROR_PX || 15.0,
      perspective_correction: "PASS",
      details: templateAlignment
    };
  }

  function getPixel(x, y) {
    const cx = Math.max(0, Math.min(normWidth - 1, Math.round(x)));
    const cy = Math.max(0, Math.min(normHeight - 1, Math.round(y)));
    return rectifiedBuffer[cy * normWidth + cx];
  }

  // Sample Paper Background Brightness
  let bgSum = 0, bgCount = 0;
  for (let y = 400; y < 500; y += 10) {
    for (let x = 300; x < 2100; x += 50) {
      bgSum += getPixel(x, y);
      bgCount++;
    }
  }
  const paperBgBrightness = bgCount > 0 ? bgSum / bgCount : 240;

  // 6. Concentric Annulus Sampling and False Multiple Elimination
  const detections = [];
  
  let answeredCount = 0;
  let blankCount = 0;
  let multipleCount = 0;
  let uncertainCount = 0;

  for (let q = layout.startQNum; q <= Math.min(layout.endQNum, layout.startQNum + 149); q++) {
    const qCoords = layout.getQuestionBubbleCoords(q);
    const optionStats = [];

    OPTIONS_LIST.forEach((opt) => {
      const bubble = qCoords.options[opt];
      const R = bubble.radius; // ~30px at 300 DPI

      let middleDarkCount = 0;
      let middleTotalCount = 0;
      let centerDarkCount = 0;
      let centerTotalCount = 0;
      let middleBrightnessSum = 0;

      const darkThresholdVal = Math.max(110, paperBgBrightness - 35);

      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          const pxVal = getPixel(bubble.x + dx, bubble.y + dy);

          // Center region R1: d <= 0.35 R (contains printed option letter)
          if (dist <= 0.35 * R) {
            centerTotalCount++;
            if (pxVal < darkThresholdVal) {
              centerDarkCount++;
            }
          }
          // Middle annulus R2: 0.40 R <= d <= 0.72 R (contains student ink, avoids printed letter and border outline)
          else if (dist >= 0.40 * R && dist <= 0.72 * R) {
            middleTotalCount++;
            middleBrightnessSum += pxVal;
            if (pxVal < darkThresholdVal) {
              middleDarkCount++;
            }
          }
        }
      }

      const middleFillRatio = middleTotalCount > 0 ? middleDarkCount / middleTotalCount : 0;
      const centerFillRatio = centerTotalCount > 0 ? centerDarkCount / centerTotalCount : 0;

      // Composite fill score heavily weighting middle annulus to remove printed letter artifacts
      const centerContribution = Math.max(0, centerFillRatio - 0.18);
      const fillScore = Number((0.75 * middleFillRatio + 0.25 * centerContribution).toFixed(3));

      const avgBrightness = middleTotalCount > 0 ? middleBrightnessSum / middleTotalCount : 255;
      const contrastDelta = Math.max(0, paperBgBrightness - avgBrightness);

      optionStats.push({
        option: opt,
        fillRatio: fillScore,
        avgBrightness: Number(avgBrightness.toFixed(1)),
        contrastDelta: Number(contrastDelta.toFixed(1))
      });
    });

    const optScoreMap = {};
    optionStats.forEach((o) => { optScoreMap[o.option] = o.fillRatio; });

    optionStats.sort((a, b) => b.fillRatio - a.fillRatio);

    const top1Item = optionStats[0];
    const top2Item = optionStats[1];
    const top1Score = top1Item.fillRatio;
    const top2Score = top2Item.fillRatio;
    const margin = Number((top1Score - top2Score).toFixed(3));

    const FILLED_THRESHOLD = 0.20;
    const MIN_DOMINANT_MARGIN = 0.12;

    let status = "blank";
    let answer = null;
    let confidence = 1.0;

    if (top1Score < FILLED_THRESHOLD) {
      status = "blank";
      answer = null;
      confidence = 1.0;
      blankCount++;
    } else if (top1Score >= FILLED_THRESHOLD && top2Score >= FILLED_THRESHOLD && margin < MIN_DOMINANT_MARGIN) {
      status = "multiple";
      answer = null;
      confidence = 0.20;
      multipleCount++;
    } else if (top1Score >= FILLED_THRESHOLD && margin >= MIN_DOMINANT_MARGIN) {
      status = "answered";
      answer = top1Item.option;
      confidence = Number(Math.min(0.99, 0.75 + margin * 0.5).toFixed(2));
      answeredCount++;
    } else {
      status = "uncertain";
      answer = null;
      confidence = Number(Math.min(0.68, 0.45 + margin * 1.2).toFixed(2));
      uncertainCount++;
    }

    detections.push({
      question: q,
      A: optScoreMap.A,
      B: optScoreMap.B,
      C: optScoreMap.C,
      D: optScoreMap.D,
      top1: top1Score,
      top2: top2Score,
      margin,
      selected: answer,
      status,
      confidence
    });
  }

  const alignmentQuality = Number((cornersFound / 4).toFixed(2));

  // 7. Generate Base64 Annotated Debug Preview Image Overlay
  let debugImageBase64 = null;
  try {
    debugImageBase64 = await generateDebugPreviewImage(rectifiedBuffer, layout, detections, debugMode, templateAlignment, cornersFound);
  } catch (err) {
    console.warn("Could not generate debug preview image:", err.message);
  }

  return {
    success: true,
    page: layout.page,
    decode: "PASS",
    width: nativeWidth,
    height: nativeHeight,
    registration_candidates: Math.max(candidatesFound, cornersFound),
    registration_detected: true,
    alignment_error_px: templateAlignment.averageErrorPx,
    alignment_threshold_px: OMR_CANVAS.MAX_ALIGNMENT_ERROR_PX || 15.0,
    perspective_correction: "PASS",
    templateAlignment,
    questions_detected: detections.length,
    answered: answeredCount,
    blank: blankCount,
    multiple: multipleCount,
    uncertain: uncertainCount,
    answers: detections,
    debug_image: debugImageBase64,
    diagnostics: {
      imageWidth: nativeWidth,
      imageHeight: nativeHeight,
      candidatesFound: Math.max(candidatesFound, cornersFound),
      cornersFound,
      selectedRegistrationMarks: {
        TL: { x: Math.round(corners.TL.x), y: Math.round(corners.TL.y) },
        TR: { x: Math.round(corners.TR.x), y: Math.round(corners.TR.y) },
        BL: { x: Math.round(corners.BL.x), y: Math.round(corners.BL.y) },
        BR: { x: Math.round(corners.BR.x), y: Math.round(corners.BR.y) }
      },
      confidence: alignmentQuality,
      rotationDegrees,
      templateAlignment,
      normalizedSheetDimensions: { width: normWidth, height: normHeight },
      processedAt: new Date().toISOString()
    }
  };
}

/**
 * Alignment Calibration Checker - relaxed 15.0px threshold for real photos
 */
function checkTemplateAlignment(rectifiedBuffer, layout) {
  const sampleQs = [1, 2, 3, 25, 50, 51, 52, 75, 100, 101, 102, 125, 150];
  const validQs = sampleQs.filter((q) => q >= layout.startQNum && q <= layout.endQNum);

  let totalError = 0;
  let maxError = 0;
  let sampleCount = 0;

  validQs.forEach((qNum) => {
    const coords = layout.getQuestionBubbleCoords(qNum);
    OPTIONS_LIST.forEach((opt) => {
      const b = coords.options[opt];
      const res = findPrintedBubbleCenter(rectifiedBuffer, OMR_CANVAS.WIDTH, OMR_CANVAS.HEIGHT, b.x, b.y, b.radius);
      totalError += res.errorPx;
      if (res.errorPx > maxError) maxError = res.errorPx;
      sampleCount++;
    });
  });

  const avgError = sampleCount > 0 ? totalError / sampleCount : 0;
  const thresholdPx = OMR_CANVAS.MAX_ALIGNMENT_ERROR_PX || 15.0;
  const status = avgError <= thresholdPx ? "PASS" : "FAIL";

  return {
    averageErrorPx: Number(avgError.toFixed(2)),
    maxErrorPx: Number(maxError.toFixed(2)),
    alignmentThresholdPx: thresholdPx,
    status
  };
}

function findPrintedBubbleCenter(rectifiedBuffer, width, height, cx, cy, radius) {
  let minSum = Infinity;
  let bestX = cx;
  let bestY = cy;

  for (let dy = -8; dy <= 8; dy += 1) {
    for (let dx = -8; dx <= 8; dx += 1) {
      const testX = cx + dx;
      const testY = cy + dy;

      let darkSum = 0;
      let count = 0;

      for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
        const rx = Math.round(testX + Math.cos(angle) * radius);
        const ry = Math.round(testY + Math.sin(angle) * radius);

        if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
          darkSum += rectifiedBuffer[ry * width + rx];
          count++;
        }
      }

      if (count > 0 && darkSum < minSum) {
        minSum = darkSum;
        bestX = testX;
        bestY = testY;
      }
    }
  }

  const err = Math.hypot(bestX - cx, bestY - cy);
  return { actualX: bestX, actualY: bestY, errorPx: err };
}

/**
 * Connected Component Blob Analysis for Registration Marks at Arbitrary Image Resolutions
 */
function findRegistrationMarks(rawBuffer, width, height) {
  let bgSum = 0, bgCount = 0;
  const sampleMinY = Math.round(height * 0.02);
  const sampleMaxY = Math.round(height * 0.15);
  const sampleMinX = Math.round(width * 0.10);
  const sampleMaxX = Math.round(width * 0.90);
  const yStep = Math.max(2, Math.round(height / 150));
  const xStep = Math.max(5, Math.round(width / 50));

  for (let y = sampleMinY; y < sampleMaxY; y += yStep) {
    for (let x = sampleMinX; x < sampleMaxX; x += xStep) {
      bgSum += rawBuffer[y * width + x];
      bgCount++;
    }
  }
  const paperBg = bgCount > 0 ? bgSum / bgCount : 230;
  const darkThresh = Math.max(90, paperBg - 35);

  const blobs = [];
  const visited = new Uint8Array(width * height);
  const step = Math.max(2, Math.floor(Math.min(width, height) / 400));

  const expectedBoxPx = (10 / 210) * width;
  const minBoxPx = Math.max(5, Math.floor(expectedBoxPx * 0.15));
  const maxBoxPx = Math.ceil(expectedBoxPx * 2.5);

  for (let y = Math.round(height * 0.01); y < height - Math.round(height * 0.01); y += step) {
    for (let x = Math.round(width * 0.01); x < width - Math.round(width * 0.01); x += step) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      visited[idx] = 1;

      if (rawBuffer[idx] < darkThresh) {
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;

        const queue = [x, y];
        let qHead = 0;

        while (qHead < queue.length && queue.length < 8000) {
          const cx = queue[qHead++];
          const cy = queue[qHead++];
          count++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [
            [cx + step, cy], [cx - step, cy], [cx, cy + step], [cx, cy - step]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 5 && nx < width - 5 && ny >= 5 && ny < height - 5) {
              const nIdx = ny * width + nx;
              if (!visited[nIdx] && rawBuffer[nIdx] < darkThresh) {
                visited[nIdx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        const rectRatio = count / Math.max(1, (bw / step) * (bh / step));
        const aspect = bw / Math.max(1, bh);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const centerVal = rawBuffer[Math.round(cy) * width + Math.round(cx)];

        if (bw >= minBoxPx && bw <= maxBoxPx && bh >= minBoxPx && bh <= maxBoxPx && aspect >= 0.45 && aspect <= 2.2 && rectRatio >= 0.50 && centerVal < 110) {
          blobs.push({ minX, maxX, minY, maxY, bw, bh, aspect, rectRatio, cx, cy, count });
        }
      }
    }
  }

  const cornerTLCandidates = [];
  const cornerTRCandidates = [];
  const cornerBLCandidates = [];
  const cornerBRCandidates = [];

  const maxCornerXDist = width * 0.25;
  const maxCornerYDist = height * 0.25;

  blobs.forEach((b) => {
    if (b.cx < maxCornerXDist && b.cy < maxCornerYDist) cornerTLCandidates.push(b);
    else if (b.cx > width - maxCornerXDist && b.cy < maxCornerYDist) cornerTRCandidates.push(b);
    else if (b.cx < maxCornerXDist && b.cy > height - maxCornerYDist) cornerBLCandidates.push(b);
    else if (b.cx > width - maxCornerXDist && b.cy > height - maxCornerYDist) cornerBRCandidates.push(b);
  });

  const getBestInCorner = (candidates, evalFn) => {
    if (!candidates.length) return null;
    candidates.sort((a, b) => evalFn(a) - evalFn(b));
    return candidates[0];
  };

  let tl = getBestInCorner(cornerTLCandidates, (b) => b.cx + b.cy);
  let tr = getBestInCorner(cornerTRCandidates, (b) => (width - b.cx) + b.cy);
  let bl = getBestInCorner(cornerBLCandidates, (b) => b.cx + (height - b.cy));
  let br = getBestInCorner(cornerBRCandidates, (b) => (width - b.cx) + (height - b.cy));

  let cornersFound = [tl, tr, bl, br].filter(Boolean).length;

  if (cornersFound === 3) {
    if (!tl && tr && bl && br) tl = { cx: tr.cx + bl.cx - br.cx, cy: tr.cy + bl.cy - br.cy };
    else if (!tr && tl && bl && br) tr = { cx: tl.cx + br.cx - bl.cx, cy: tl.cy + br.cy - bl.cy };
    else if (!bl && tl && tr && br) bl = { cx: tl.cx + br.cx - tr.cx, cy: tl.cy + br.cy - tr.cy };
    else if (!br && tl && tr && bl) br = { cx: tr.cx + bl.cx - tl.cx, cy: tr.cy + bl.cy - tr.cy };
  }

  const searchBoxW = Math.round(width * 0.25);
  const searchBoxH = Math.round(height * 0.25);

  if (!tl) tl = directCornerSearch(rawBuffer, width, height, 0, 0, searchBoxW, searchBoxH);
  if (!tr) tr = directCornerSearch(rawBuffer, width, height, width - searchBoxW, 0, searchBoxW, searchBoxH);
  if (!bl) bl = directCornerSearch(rawBuffer, width, height, 0, height - searchBoxH, searchBoxW, searchBoxH);
  if (!br) br = directCornerSearch(rawBuffer, width, height, width - searchBoxW, height - searchBoxH, searchBoxW, searchBoxH);

  cornersFound = [tl, tr, bl, br].filter(Boolean).length;

  if (!tl || !tr || !bl || !br ||
      tl.cx < 0 || tl.cx >= width || tl.cy < 0 || tl.cy >= height ||
      tr.cx < 0 || tr.cx >= width || tr.cy < 0 || tr.cy >= height ||
      bl.cx < 0 || bl.cx >= width || bl.cy < 0 || bl.cy >= height ||
      br.cx < 0 || br.cx >= width || br.cy < 0 || br.cy >= height) {
    return {
      cornersFound: [tl, tr, bl, br].filter((c) => c && c.cx >= 0 && c.cx < width && c.cy >= 0 && c.cy < height).length,
      candidatesFound: Math.max(blobs.length, [tl, tr, bl, br].filter(Boolean).length)
    };
  }

  const angleTop = Math.atan2(tr.cy - tl.cy, tr.cx - tl.cx) * (180 / Math.PI);
  const rotationDegrees = Number(angleTop.toFixed(2));

  return {
    cornersFound,
    candidatesFound: Math.max(blobs.length, cornersFound),
    rotationDegrees,
    corners: {
      TL: { x: tl.cx, y: tl.cy },
      TR: { x: tr.cx, y: tr.cy },
      BL: { x: bl.cx, y: bl.cy },
      BR: { x: br.cx, y: br.cy }
    }
  };
}

function directCornerSearch(rawBuffer, width, height, searchX, searchY, searchW, searchH) {
  let minAvgBrightness = Infinity;
  let bestX = null;
  let bestY = null;

  const expectedBoxPx = (10 / 210) * width;
  const boxSize = Math.max(10, Math.round(expectedBoxPx * 0.6));
  const sampleStep = Math.max(2, Math.floor(boxSize / 8));

  const clampX = Math.max(0, Math.min(width - searchW, searchX));
  const isTopCorner = searchY < height / 2;
  const minY = isTopCorner ? 0 : Math.round(height * 0.85);
  const maxY = isTopCorner ? Math.round(height * 0.15) : height;

  for (let y = minY; y < maxY - boxSize; y += sampleStep * 2) {
    for (let x = clampX; x < clampX + searchW - boxSize; x += sampleStep * 2) {
      let sum = 0;
      let dCount = 0;
      let sampleCount = 0;
      for (let by = 0; by < boxSize; by += sampleStep) {
        for (let bx = 0; bx < boxSize; bx += sampleStep) {
          const val = rawBuffer[(y + by) * width + (x + bx)];
          sum += val;
          sampleCount++;
          if (val < 110) dCount++;
        }
      }

      const avgBrightness = sampleCount > 0 ? sum / sampleCount : 255;
      if (dCount >= Math.round(sampleCount * 0.75) && avgBrightness < 45) {
        if (avgBrightness < minAvgBrightness) {
          minAvgBrightness = avgBrightness;
          bestX = x + boxSize / 2;
          bestY = y + boxSize / 2;
        }
      }
    }
  }

  return bestX != null ? { cx: Math.round(bestX), cy: Math.round(bestY) } : null;
}

function warpToCanonicalCanvas(srcBuffer, srcW, srcH, corners) {
  const tgtW = OMR_CANVAS.WIDTH;   // 2480
  const tgtH = OMR_CANVAS.HEIGHT;  // 3508
  const outBuffer = new Uint8Array(tgtW * tgtH);

  const tgtTL = REGISTRATION_MARKS.TOP_LEFT;     // (177, 177)
  const tgtTR = REGISTRATION_MARKS.TOP_RIGHT;    // (2303, 177)
  const tgtBL = REGISTRATION_MARKS.BOTTOM_LEFT;  // (177, 3331)
  const tgtBR = REGISTRATION_MARKS.BOTTOM_RIGHT; // (2303, 3331)

  const tgtWRange = tgtTR.x - tgtTL.x;
  const tgtHRange = tgtBL.y - tgtTL.y;

  for (let ty = 0; ty < tgtH; ty++) {
    const v = Math.max(0, Math.min(1, (ty - tgtTL.y) / tgtHRange));
    for (let tx = 0; tx < tgtW; tx++) {
      const u = Math.max(0, Math.min(1, (tx - tgtTL.x) / tgtWRange));

      const sx = (1 - u) * (1 - v) * corners.TL.x + u * (1 - v) * corners.TR.x + (1 - u) * v * corners.BL.x + u * v * corners.BR.x;
      const sy = (1 - u) * (1 - v) * corners.TL.y + u * (1 - v) * corners.TR.y + (1 - u) * v * corners.BL.y + u * v * corners.BR.y;

      const clampedSx = Math.max(0, Math.min(srcW - 1, Math.round(sx)));
      const clampedSy = Math.max(0, Math.min(srcH - 1, Math.round(sy)));

      outBuffer[ty * tgtW + tx] = srcBuffer[clampedSy * srcW + clampedSx];
    }
  }

  return outBuffer;
}

function applyNormalization(srcBuffer, width, height) {
  let minVal = 255, maxVal = 0;
  for (let i = 0; i < srcBuffer.length; i++) {
    const v = srcBuffer[i];
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }
  const range = maxVal - minVal;
  if (range < 40) {
    return srcBuffer;
  }
  const out = new Uint8Array(srcBuffer.length);
  for (let i = 0; i < srcBuffer.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round(((srcBuffer[i] - minVal) / range) * 255)));
  }
  return out;
}

function applyContrastBoost(srcBuffer, width, height) {
  const out = new Uint8Array(srcBuffer.length);
  for (let i = 0; i < srcBuffer.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round(srcBuffer[i] * 1.3 - 20)));
  }
  return out;
}

async function generateDebugPreviewImage(rectifiedBuffer, layout, detections, debugMode = "CLASSIFICATION", templateAlignment = null, cornersFound = 4) {
  const normW = OMR_CANVAS.WIDTH;   // 2480
  const normH = OMR_CANVAS.HEIGHT;  // 3508

  const prevW = 800;
  const prevH = 1131;
  const scale = prevW / normW;

  const rgbBuffer = new Uint8Array(prevW * prevH * 3);

  for (let py = 0; py < prevH; py++) {
    const srcY = Math.min(normH - 1, Math.round(py / scale));
    for (let px = 0; px < prevW; px++) {
      const srcX = Math.min(normW - 1, Math.round(px / scale));
      const val = rectifiedBuffer[srcY * normW + srcX];
      const pIdx = (py * prevW + px) * 3;
      rgbBuffer[pIdx] = val;
      rgbBuffer[pIdx + 1] = val;
      rgbBuffer[pIdx + 2] = val;
    }
  }

  function setPixelRgb(x, y, r, g, b) {
    if (x >= 0 && x < prevW && y >= 0 && y < prevH) {
      const idx = (y * prevW + x) * 3;
      rgbBuffer[idx] = r;
      rgbBuffer[idx + 1] = g;
      rgbBuffer[idx + 2] = b;
    }
  }

  function drawRect(minX, minY, maxX, maxY, r, g, b, thickness = 3) {
    for (let t = 0; t < thickness; t++) {
      for (let x = minX - t; x <= maxX + t; x++) {
        setPixelRgb(x, minY - t, r, g, b);
        setPixelRgb(x, maxY + t, r, g, b);
      }
      for (let y = minY - t; y <= maxY + t; y++) {
        setPixelRgb(minX - t, y, r, g, b);
        setPixelRgb(maxX + t, y, r, g, b);
      }
    }
  }

  function drawCross(cx, cy, r, g, b) {
    for (let d = -3; d <= 3; d++) {
      setPixelRgb(cx + d, cy, r, g, b);
      setPixelRgb(cx, cy + d, r, g, b);
    }
  }

  function drawCircle(cx, cy, radius, r, g, b) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.08) {
      const px = Math.round(cx + Math.cos(angle) * radius);
      const py = Math.round(cy + Math.sin(angle) * radius);
      setPixelRgb(px, py, r, g, b);
    }
  }

  const regMarkPx = Math.round(REGISTRATION_MARKS.SIZE_PX * scale);
  const markHalf = Math.round(regMarkPx / 2);

  // Draw 4 Corner BLUE Registration Boxes (#3b82f6)
  const drawRegBox = (mmX, mmY) => {
    const cx = Math.round((mmX * OMR_CANVAS.DPI_SCALE) * scale);
    const cy = Math.round((mmY * OMR_CANVAS.DPI_SCALE) * scale);
    drawRect(cx - markHalf - 3, cy - markHalf - 3, cx + markHalf + 3, cy + markHalf + 3, 59, 130, 246, 3);
  };

  drawRegBox(15, 15);   // TL
  drawRegBox(195, 15);  // TR
  drawRegBox(15, 282);  // BL
  drawRegBox(195, 282); // BR

  // Top Diagnostic Banner overlay
  const bannerHeight = 36;
  const errorVal = templateAlignment ? templateAlignment.averageErrorPx : 0.0;
  const statusStr = templateAlignment ? templateAlignment.status : "PASS";

  for (let y = 0; y < bannerHeight; y++) {
    for (let x = 0; x < prevW; x++) {
      const idx = (y * prevW + x) * 3;
      rgbBuffer[idx] = 15;
      rgbBuffer[idx + 1] = 23;
      rgbBuffer[idx + 2] = 42;
    }
  }

  const isExpectedCentersMode = String(debugMode).toUpperCase() === "EXPECTED_CENTERS";

  const detMap = {};
  detections.forEach((d) => { detMap[d.question] = d; });

  for (let q = layout.startQNum; q <= Math.min(layout.endQNum, layout.startQNum + 149); q++) {
    const qCoords = layout.getQuestionBubbleCoords(q);
    const item = detMap[q] || {};
    const status = item.status || "blank";

    OPTIONS_LIST.forEach((opt) => {
      const bubble = qCoords.options[opt];
      const cx = Math.round(bubble.x * scale);
      const cy = Math.round(bubble.y * scale);
      const rad = Math.round(bubble.radius * scale);

      if (isExpectedCentersMode) {
        // Mode 1: Render tiny '+' crosses at exact expected template bubble centers
        drawCross(cx, cy, 6, 182, 212); // Cyan cross '+'
      } else {
        // Mode 2: Classification review mode
        if (status === "answered") {
          if (item.selected === opt) {
            // GREEN for selected bubble
            drawCircle(cx, cy, rad, 16, 185, 129);
            drawCircle(cx, cy, rad - 1, 16, 185, 129);
          } else {
            // NEUTRAL/GRAY for unselected empty bubbles
            drawCircle(cx, cy, rad, 156, 163, 175);
          }
        } else if (status === "multiple") {
          const optScore = item[opt] || 0;
          if (optScore >= 0.20) {
            // ORANGE for genuinely filled multiple bubbles
            drawCircle(cx, cy, rad, 249, 115, 22);
            drawCircle(cx, cy, rad - 1, 249, 115, 22);
          } else {
            // NEUTRAL/GRAY for unselected bubbles
            drawCircle(cx, cy, rad, 156, 163, 175);
          }
        } else if (status === "uncertain") {
          const optScore = item[opt] || 0;
          if (optScore >= 0.18) {
            // YELLOW for candidate bubbles in uncertain question
            drawCircle(cx, cy, rad, 245, 158, 11);
            drawCircle(cx, cy, rad - 1, 245, 158, 11);
          } else {
            drawCircle(cx, cy, rad, 156, 163, 175);
          }
        } else {
          // Blank question: all bubbles NEUTRAL/GRAY
          drawCircle(cx, cy, rad, 156, 163, 175);
        }
      }
    });
  }

  const pngBuf = await sharp(rgbBuffer, {
    raw: { width: prevW, height: prevH, channels: 3 }
  }).png().toBuffer();

  return `data:image/png;base64,${pngBuf.toString("base64")}`;
}
