import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import Test from "../../../models/Test";

export async function GET() {
  try {
    await connectToDatabase();
    const tests = await Test.find().lean();
    return NextResponse.json({ success: true, count: tests.length, tests });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
