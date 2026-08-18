import mongoose from "mongoose";

const doubtSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
    adminReply: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Resolved"], default: "Pending" }
  },
  { timestamps: true }
);

export default mongoose.models.Doubt || mongoose.model("Doubt", doubtSchema);
