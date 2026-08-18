import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true, index: true },
  content: { type: String, trim: true, default: "" },
  fileUrl: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

noteSchema.index({ title: "text", subject: "text" });

export default mongoose.models.Note || mongoose.model("Note", noteSchema);
