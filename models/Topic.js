import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent duplicate topic names within the same chapter
topicSchema.index({ chapterId: 1, name: 1 }, { unique: true });

export default mongoose.models.Topic || mongoose.model("Topic", topicSchema);
