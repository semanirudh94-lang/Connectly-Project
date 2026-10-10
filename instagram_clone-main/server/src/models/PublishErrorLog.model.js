import mongoose from "mongoose";

// Append-only record of every scheduled-post publish failure, so failures can be
// audited after the post itself is retried, fixed or deleted.
const publishErrorLogSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    attempt: { type: Number, required: true },
    error: { type: String, required: true },
    // true once the retry budget was exhausted and the post became "failed"
    permanent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

publishErrorLogSchema.index({ createdAt: -1 });

export default mongoose.model("PublishErrorLog", publishErrorLogSchema);
