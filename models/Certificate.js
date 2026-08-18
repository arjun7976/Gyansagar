import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", index: true },
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "TestAttempt", index: true },
  type: { type: String, enum: ["test", "monthly"], default: "test", index: true },
  monthYear: { type: String }, // e.g. "August 2026"
  percentage: { type: Number, required: true },
  rank: { type: Number },
  issuedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["valid", "revoked"], default: "valid", index: true }
}, { timestamps: true });

// Ensure one test certificate per attempt
certificateSchema.index({ attemptId: 1 }, { unique: true, sparse: true });

// Ensure one monthly certificate per student per month
certificateSchema.index({ studentId: 1, monthYear: 1, type: 1 }, { unique: true, partialFilterExpression: { type: "monthly" } });

export default mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema);
