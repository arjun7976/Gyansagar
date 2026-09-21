import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin";
import { generateOmrVectorPdf, generateOmrPngImage } from "../../../../../lib/omr/generator";

export async function GET(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const questionCount = parseInt(searchParams.get("questionCount") || "100", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const examTitle = searchParams.get("examTitle") || "GyanSagar Examination";
    const format = (searchParams.get("format") || "pdf").toLowerCase();

    if (format === "png") {
      const pngBuffer = await generateOmrPngImage({
        questionCount,
        page,
        examTitle
      });

      const headers = new Headers();
      headers.set("Content-Type", "image/png");
      headers.set(
        "Content-Disposition",
        `inline; filename="GyanSagar_OMR_Sheet_Page${page}_${questionCount}Q.png"`
      );

      return new NextResponse(pngBuffer, {
        status: 200,
        headers
      });
    }

    const pdfBuffer = generateOmrVectorPdf({
      questionCount,
      page,
      examTitle
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `inline; filename="GyanSagar_OMR_Sheet_Page${page}_${questionCount}Q.pdf"`
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Generate OMR Vector Template Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate OMR template." },
      { status: 500 }
    );
  }
}
