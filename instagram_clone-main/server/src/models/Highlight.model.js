import mongoose from "mongoose";

// Highlights keep selected stories on the profile permanently, even after the
// underlying stories expire. The expiry cron must NOT purge media of stories
// that belong to a highlight.
const highlightSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    cover: { type: String, default: "" }, // media url used as the highlight cover
    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Highlight", highlightSchema);
