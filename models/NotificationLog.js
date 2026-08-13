import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["welcome", "result", "certificate"], required: true, index: true },
  channel: { type: String, enum: ["email", "whatsapp"], required: true, index: true },
  status: { type: String, enum: ["pending", "sent", "failed"], default: "pending", index: true },
  recipient: { type: String, required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // Can be testId, attemptId, etc.
  errorMessage: { type: String },
  sentAt: { type: Date },
  retryCount: { type: Number, default: 0 }
}, { timestamps: true });

notificationLogSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationLogSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.NotificationLog || mongoose.model("NotificationLog", notificationLogSchema);
