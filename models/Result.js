import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({ student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true, index: true }, score: { type: Number, default: 0 }, rank: { type: Number, min: 1 }, attemptedAt: { type: Date, default: Date.now } }, { timestamps: true });
resultSchema.index({ student: 1, test: 1 });
export default mongoose.models.Result || mongoose.model("Result", resultSchema);
