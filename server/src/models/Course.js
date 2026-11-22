import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    instructor: { type: String, required: true, trim: true, maxlength: 80 },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["pending", "approved"], default: "approved" },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    term: { type: String, required: true, trim: true, maxlength: 40 }
  },
  { timestamps: true }
);

courseSchema.index({ code: 1, term: 1 }, { unique: true });

export default mongoose.model("Course", courseSchema);
