import mongoose from "mongoose";

// One view record per (story, viewer). The UNIQUE compound index guarantees a
// single user is counted only once and prevents duplicate view records.
const storyViewSchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
    },
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    viewedAt: { type: Date, default: Date.now },
    lastViewedAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false },
    lastItemIndex: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Dedupe unique viewers (also makes "has X viewed Y?" O(1)).
storyViewSchema.index({ story: 1, viewer: 1 }, { unique: true });
// Viewer list + view timeline (ordered by time).
storyViewSchema.index({ story: 1, viewedAt: -1 });

export default mongoose.model("StoryView", storyViewSchema);
