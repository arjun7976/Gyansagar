import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Certificate from "../../../../../models/Certificate";
import TestAttempt from "../../../../../models/TestAttempt";
import User from "../../../../../models/User";
import { requireAdmin } from "../../../../../lib/admin";
import { generateCertificateId } from "../../../../../lib/certificate";

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { month, year, monthYear } = await req.json();
    if (!month || !year || !monthYear) {
      return NextResponse.json({ success: false, message: "Month and year are required" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if certificates already generated for this month
    const existingCerts = await Certificate.countDocuments({ type: "monthly", monthYear });
    if (existingCerts > 0) {
      return NextResponse.json({ success: false, message: `Certificates for ${monthYear} have already been generated!` }, { status: 400 });
    }

    // Determine date range for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 1); // 1st of next month

    // Aggregate all attempts in that month
    const leaderboard = await TestAttempt.aggregate([
      {
        $match: {
          status: { $in: ["submitted", "auto_submitted"] },
          submittedAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: "$studentId",
          totalScore: { $sum: "$score" },
          averagePercentage: { $avg: "$percentage" },
          testsTaken: { $sum: 1 }
        }
      },
      {
        // Only consider students who took at least 1 test (already guaranteed by grouping, but just in case)
        $match: { testsTaken: { $gt: 0 } }
      },
      {
        $sort: { averagePercentage: -1, totalScore: -1 }
      },
      {
        $limit: 3
      }
    ]);

    if (leaderboard.length === 0) {
      return NextResponse.json({ success: false, message: `No test attempts found in ${monthYear}.` }, { status: 400 });
    }

    // Generate certificates
    const createdCerts = [];
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const rank = i + 1;

      const student = await User.findById(entry._id);
      if (!student) continue;

      const certificate = await Certificate.create({
        certificateId: generateCertificateId(),
        studentId: student._id,
        type: "monthly",
        monthYear,
        percentage: Math.round(entry.averagePercentage),
        rank,
        issuedAt: new Date(),
        status: "valid"
      });

      createdCerts.push(certificate);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully generated ${createdCerts.length} Monthly Certificates for ${monthYear}!`,
      certificates: createdCerts 
    });
  } catch (error) {
    console.error("Monthly Certificate error:", error);
    return NextResponse.json({ success: false, message: "Server error generating monthly certificates" }, { status: 500 });
  }
}
