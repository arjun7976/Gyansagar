import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Doubt from "../../../../../models/Doubt";
import { requireAdmin, isObjectId } from "../../../../../lib/admin";

export async function PUT(req, { params }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid Doubt ID" }, { status: 400 });

    const { adminReply } = await req.json();
    if (!adminReply) return NextResponse.json({ success: false, message: "Reply is required" }, { status: 400 });

    await connectToDatabase();
    
    const doubt = await Doubt.findById(id);
    if (!doubt) return NextResponse.json({ success: false, message: "Doubt not found" }, { status: 404 });

    doubt.adminReply = adminReply;
    doubt.status = "Resolved";
    await doubt.save();

    return NextResponse.json({ success: true, message: "Reply sent successfully", doubt });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
