import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    anonymous: { type: Boolean, default: false },
    reply: {
      message: { type: String, trim: true, maxlength: 1000 },
      professor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      repliedAt: { type: Date }
    }
  },
  { timestamps: true }
);

feedbackSchema.index({ course: 1, student: 1 }, { unique: true });

export default mongoose.model("Feedback", feedbackSchema);
