import mongoose from "mongoose";

// A user-generated report against any moderatable entity. Admins triage these
// from the dashboard (filter by status / targetType, then resolve or dismiss).
const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["user", "post", "story", "comment"],
      required: true,
      index: true,
    },
    // Kept as a plain id (not a hard ref) so a report survives even if the
    // reported entity is later deleted.
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ["spam", "nudity", "violence", "hate", "harassment", "other"],
      default: "other",
    },
    description: { type: String, default: "", maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
