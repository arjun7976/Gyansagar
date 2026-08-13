import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent duplicate chapter names within the same subject
chapterSchema.index({ subjectId: 1, name: 1 }, { unique: true });

export default mongoose.models.Chapter || mongoose.model("Chapter", chapterSchema);
