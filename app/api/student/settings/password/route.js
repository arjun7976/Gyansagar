import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "../../../../../models/User";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { currentStudent } from "../../../../../lib/student-auth";

export async function POST(req) {
  try {
    const student = await currentStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ success: false, message: "Invalid password details provided. New password must be at least 8 characters long." }, { status: 400 });
    }

    await connectToDatabase();
    
    // Fetch user with password field
    const user = await User.findById(student.id).select("+password");
    
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "Incorrect current password" }, { status: 401 });
    }

    // Hash new password and save
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json({ success: false, message: "Server error updating password" }, { status: 500 });
  }
}
