import mongoose from "mongoose";

const professorInviteSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

professorInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ProfessorInvite", professorInviteSchema);
