import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true, default: "" },
  code: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

subjectSchema.index({ name: "text", code: "text" });

export default mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
