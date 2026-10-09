import mongoose from "mongoose";

// Append-only record of every administrative action for accountability.
const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // e.g. "user.create", "post.delete", "report.update"
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Human-readable one-liner shown in the dashboard audit tab.
    summary: { type: String, default: "" },
    // Optional before/after snapshot for updates.
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
