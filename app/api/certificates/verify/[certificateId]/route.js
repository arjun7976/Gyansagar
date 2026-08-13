import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Certificate from "../../../../../models/Certificate";
import User from "../../../../../models/User";
import Test from "../../../../../models/Test";

export async function GET(req, { params }) {
  try {
    const { certificateId } = await params;
    await connectToDatabase();

    const certificate = await Certificate.findOne({ certificateId })
      .populate("studentId", "name")
      .populate("testId", "title subject")
      .lean();

    if (!certificate) {
      return NextResponse.json({ 
        success: false, 
        message: "Certificate not found" 
      }, { status: 404 });
    }

    if (certificate.status === "revoked") {
      return NextResponse.json({ 
        success: false, 
        message: "Certificate has been revoked",
        revoked: true
      }, { status: 200 });
    }

    // Return only public information
    return NextResponse.json({ 
      success: true, 
      data: {
        studentName: certificate.studentId?.name,
        testName: certificate.testId?.title,
        subject: certificate.testId?.subject,
        percentage: certificate.percentage,
        rank: certificate.rank,
        issuedAt: certificate.issuedAt,
        certificateId: certificate.certificateId
      }
    });
  } catch (error) {
    console.error("Certificate verification error:", error);
    return NextResponse.json({ success: false, message: "Verification failed" }, { status: 500 });
  }
}
