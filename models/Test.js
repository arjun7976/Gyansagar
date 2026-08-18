import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  instructions: { type: String, trim: true, default: "" },
  duration: { type: Number, required: true, default: 30, min: 1 },
  totalMarks: { type: Number, default: 100, min: 1 },
  negativeMarks: { type: Number, default: 0, min: 0 },
  passingPercentage: { type: Number, default: 40, min: 0, max: 100 },
  shuffleQuestions: { type: Boolean, default: true },
  shuffleOptions: { type: Boolean, default: false },
  showResultImmediately: { type: Boolean, default: true },
  maxAttempts: { type: Number, default: 1, min: 1 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  selectionMode: { type: String, enum: ["manual", "random"], default: "manual" },
  randomConfig: {
    totalQuestions: { type: Number, default: 0 },
    difficultyDistribution: {
      Easy: { type: Number, default: 0 },
      Medium: { type: Number, default: 0 },
      Hard: { type: Number, default: 0 }
    },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
    tags: [{ type: String }]
  },
  // Certificate settings
  enableCertificate: { type: Boolean, default: false },
  certificateMinPercentage: { type: Number, default: 60, min: 0, max: 100 },
  certificateTitle: { type: String, default: "Certificate of Achievement" },
  certificateDescription: { type: String, default: "" },
  // Notification settings
  emailNotifications: {
    result: { type: Boolean, default: false },
    certificate: { type: Boolean, default: false },
    welcome: { type: Boolean, default: false }
  },
  whatsappNotifications: {
    result: { type: Boolean, default: false },
    certificate: { type: Boolean, default: false }
  },
  status: { type: String, enum: ["draft", "published", "closed"], default: "draft", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

testSchema.index({ title: "text", subject: "text" });

export default mongoose.models.Test || mongoose.model("Test", testSchema);