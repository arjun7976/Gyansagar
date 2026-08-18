import mongoose from "mongoose";
import { NextResponse } from "next/server";
import User from "../../../../../models/User";
import TestAttempt from "../../../../../models/TestAttempt";
import Test from "../../../../../models/Test";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { requireAdmin, isObjectId } from "../../../../../lib/admin";
import bcrypt from "bcryptjs";

export async function GET(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid student ID" }, { status: 400 });

    await connectToDatabase();

    const student = await User.findById(id).select("name email mobile isActive createdAt").lean();
    if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

    // Fetch test attempts
    const attempts = await TestAttempt.find({ studentId: id, status: { $in: ["submitted", "auto_submitted"] } })
      .populate({ path: "testId", select: "title totalMarks passingPercentage", model: Test })
      .sort({ submittedAt: -1 })
      .lean();

    // Calculate rank for each attempt
    const history = [];
    for (const attempt of attempts) {
      if (!attempt.testId) continue;
      
      const leaderboard = await TestAttempt.aggregate([
        { $match: { testId: attempt.testId._id, status: { $in: ["submitted", "auto_submitted"] } } },
        { $sort: { score: -1, accuracy: -1, timeTakenSeconds: 1, submittedAt: 1 } },
        {
          $group: {
            _id: "$studentId",
            score: { $first: "$score" },
            percentage: { $first: "$percentage" },
            accuracy: { $first: "$accuracy" },
            timeTakenSeconds: { $first: "$timeTakenSeconds" },
            submittedAt: { $first: "$submittedAt" }
          }
        },
        { $sort: { score: -1, accuracy: -1, timeTakenSeconds: 1, submittedAt: 1 } }
      ]);
      
      const myIndex = leaderboard.findIndex(entry => entry._id.toString() === id);
      const rank = myIndex !== -1 ? myIndex + 1 : "-";
      
      history.push({
        _id: attempt._id,
        testName: attempt.testId.title,
        score: attempt.score,
        totalMarks: attempt.testId.totalMarks,
        percentage: attempt.percentage,
        result: attempt.percentage >= attempt.testId.passingPercentage ? "Pass" : "Fail",
        rank,
        totalParticipants: leaderboard.length,
        submittedAt: attempt.submittedAt
      });
    }

    return NextResponse.json({ success: true, data: { ...student, history } });
  } catch (error) {
    console.error("Admin Student GET Error:", error);
    return NextResponse.json({ success: false, message: "Server error fetching student data" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid student ID" }, { status: 400 });

    const { name, email, mobile, password, isActive } = await req.json();

    await connectToDatabase();
    const student = await User.findById(id);
    if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

    student.name = name?.trim() || student.name;
    if (email) student.email = email.trim().toLowerCase();
    if (mobile) student.mobile = mobile.trim();
    if (typeof isActive === "boolean") student.isActive = isActive;
    
    if (password && password.length >= 8) {
      student.password = await bcrypt.hash(password, 12);
    }

    await student.save();
    return NextResponse.json({ success: true, message: "Student updated successfully" });
  } catch (error) {
    console.error("Admin Student PUT Error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Email or mobile already in use by another account" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Server error updating student" }, { status: 500 });
  }
}
