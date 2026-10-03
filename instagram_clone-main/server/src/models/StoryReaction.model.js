import mongoose from "mongoose";

const storyReactionSchema = new mongoose.Schema(
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
    emoji: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

// A user can send the same emoji to a story only once.
storyReactionSchema.index({ story: 1, user: 1, emoji: 1 }, { unique: true });
storyReactionSchema.index({ story: 1 });

export default mongoose.model("StoryReaction", storyReactionSchema);
