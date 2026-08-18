import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import Certificate from "../../../../../../models/Certificate";
import Test from "../../../../../../models/Test";
import User from "../../../../../../models/User";
import { currentStudent } from "../../../../../../lib/student-auth";
import { generateCertificatePDF } from "../../../../../../lib/pdf/certificatePdf";

export async function GET(req, { params }) {
  try {
    const student = await currentStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const certificate = await Certificate.findOne({ _id: id, studentId: student.id })
      .populate("testId")
      .lean();

    if (!certificate) {
      return NextResponse.json({ success: false, message: "Certificate not found" }, { status: 404 });
    }

    if (certificate.status !== "valid") {
      return NextResponse.json({ success: false, message: "Certificate has been revoked" }, { status: 400 });
    }

    const studentData = await User.findById(student.id).lean();
    let test = null;
    if (certificate.testId) {
      test = await Test.findById(certificate.testId._id || certificate.testId).lean();
    }

    const pdfDoc = await generateCertificatePDF(certificate, studentData, test);
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certificate.certificateId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error("Certificate PDF generation error:", error);
    return NextResponse.json({ success: false, message: "Failed to generate certificate PDF" }, { status: 500 });
  }
}
