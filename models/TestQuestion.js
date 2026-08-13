import mongoose from "mongoose";

const testQuestionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
  questionOrder: { type: Number, default: 0 },
  marksOverride: { type: Number, default: null } // If admin wants to override default question marks for a specific test
}, { timestamps: true });

// A question can only be added to a test once
testQuestionSchema.index({ testId: 1, questionId: 1 }, { unique: true });
// For ordering
testQuestionSchema.index({ testId: 1, questionOrder: 1 });

export default mongoose.models.TestQuestion || mongoose.model("TestQuestion", testQuestionSchema);
