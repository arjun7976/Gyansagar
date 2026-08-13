import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true, index: true },
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "TestAttempt", required: true, index: true },
  percentage: { type: Number, required: true },
  rank: { type: Number },
  issuedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["valid", "revoked"], default: "valid", index: true }
}, { timestamps: true });

// Ensure one certificate per attempt
certificateSchema.index({ attemptId: 1 }, { unique: true });

export default mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema);
