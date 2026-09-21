import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdmin } from "../../../../../lib/admin";
import { processOmrSheetScan } from "../../../../../lib/omr/detector";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided for diagnosis." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    if (!imageBuffer || imageBuffer.length === 0) {
      return NextResponse.json({ success: false, message: "Uploaded file is empty." }, { status: 400 });
    }

    const magicBytes = imageBuffer.slice(0, 8).toString("hex");

    let metadata = null;
    let decodedInfo = null;

    try {
      const sharpInst = sharp(imageBuffer, { page: 0 });
      metadata = await sharpInst.metadata();

      const decoded = await sharpInst
        .rotate()
        .removeAlpha()
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      decodedInfo = decoded.info;
    } catch (err) {
      return NextResponse.json({
        success: false,
        stage: "image_decode",
        error_code: "IMAGE_DECODE_FAILED",
        diagnostics: {
          input_file_size: imageBuffer.length,
          mime_type: file.type || "unknown",
          magic_bytes: magicBytes,
          decode_error: err.message
        }
      }, { status: 400 });
    }

    const scanResult = await processOmrSheetScan(imageBuffer, 100, 1);

    return NextResponse.json({
      success: true,
      stage: "diagnostic_complete",
      diagnostics: {
        input_file_size: imageBuffer.length,
        mime_type: file.type || "unknown",
        magic_bytes: magicBytes,
        decoded_format: metadata?.format || decodedInfo?.format || "png",
        decoded_width: decodedInfo?.width || metadata?.width || 0,
        decoded_height: decodedInfo?.height || metadata?.height || 0,
        channels: decodedInfo?.channels || metadata?.channels || 3,
        registration_success: scanResult.success,
        registration_error: scanResult.success ? null : scanResult.reason,
        candidatesFound: scanResult.diagnostics?.candidatesFound ?? (scanResult.details?.candidatesFound || 0),
        cornersFound: scanResult.diagnostics?.cornersFound ?? 0,
        selectedRegistrationMarks: scanResult.diagnostics?.selectedRegistrationMarks || null
      }
    });
  } catch (error) {
    console.error("OMR Diagnostic Route Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
