import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { requireAdmin } from "../../../../../lib/admin";
import User from "../../../../../models/User";

export async function GET(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams.get("search")?.trim() || "";
  await connectToDatabase();
  const filter = { role: "student", isActive: true };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
      { batch: { $regex: search, $options: "i" } }
    ];
  }
  const students = await User.find(filter)
    .select("_id name email mobile batch createdAt")
    .sort({ name: 1 })
    .limit(50)
    .lean();
  return NextResponse.json({ success: true, results: students });
}

import bcrypt from "bcryptjs";

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, email, mobile, batch, password } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: "Student Name is required." }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ success: false, message: "Student Email is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile?.trim() || undefined;
    const rawPassword = password?.trim() || "Student@123";

    await connectToDatabase();

    // Check for existing user with same email or mobile
    const existingFilter = [{ email: cleanEmail }];
    if (cleanMobile) {
      existingFilter.push({ mobile: cleanMobile });
    }
    const existingUser = await User.findOne({ $or: existingFilter });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: existingUser.email === cleanEmail
            ? `Student account with email "${cleanEmail}" already exists.`
            : `Student account with mobile "${cleanMobile}" already exists.`
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    const newStudent = await User.create({
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password: hashedPassword,
      role: "student",
      batch: batch?.trim() || "",
      isActive: true
    });

    return NextResponse.json(
      {
        success: true,
        message: `Student "${newStudent.name}" registered successfully.`,
        student: {
          _id: newStudent._id,
          name: newStudent.name,
          email: newStudent.email,
          mobile: newStudent.mobile,
          batch: newStudent.batch
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Student Registration Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to register student." },
      { status: 500 }
    );
  }
}
