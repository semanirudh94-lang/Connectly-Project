import mongoose from "mongoose";

// One Story document = one media item. A user's "story" for the day is the
// set of their active, unexpired Story docs (rendered as a sequence).
const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    media: {
      url: { type: String, required: true },
      type: { type: String, enum: ["image", "video"], required: true },
      publicId: { type: String },
      width: Number,
      height: Number,
      duration: Number, // seconds, video only
    },
    privacy: {
      type: String,
      enum: ["public", "followers", "close_friends"],
      default: "public",
    },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true }, // shows in feed?
    isArchived: { type: Boolean, default: false }, // expired, kept for analytics
    isDeleted: { type: Boolean, default: false }, // owner deleted before expiry
    highlight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Highlight",
      default: null,
    },

    // Denormalized analytics counters -> O(1) dashboard summary reads.
    viewsCount: { type: Number, default: 0 }, // unique viewers (deduped)
    completedCount: { type: Number, default: 0 },
    reactionsCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Feed: active, unexpired stories for a user, newest first.
storySchema.index({ user: 1, isActive: 1, expiresAt: -1 });
// Cron: efficiently find expired-but-still-active stories.
storySchema.index({ isActive: 1, expiresAt: 1 });

export default mongoose.model("Story", storySchema);
