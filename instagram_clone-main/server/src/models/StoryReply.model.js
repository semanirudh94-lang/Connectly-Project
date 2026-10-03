import mongoose from "mongoose";

const storyReplySchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

storyReplySchema.index({ story: 1, createdAt: -1 });

export default mongoose.model("StoryReply", storyReplySchema);
