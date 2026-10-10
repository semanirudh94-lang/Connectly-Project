import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
    },

    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    width: Number,
    height: Number,
    duration: Number, // only for videos
  },
  {
    _id: false,
  },
);

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    media: {
      type: [mediaSchema],
      validate: [(arr) => arr.length > 0, "At least one media is required"],
    },

    caption: {
      type: String,
      maxlength: 2200,
      default: "",
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    taggedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    visibility: {
      type: String,
      enum: ["public", "followers"],
      default: "public",
    },

    // Scheduling. `status` defaults to "published" so every existing/normal post
    // keeps working. A "scheduled" post is hidden from feed & profile until the
    // scheduler flips it to "published" at `scheduledFor`.
    status: {
      type: String,
      enum: ["scheduled", "published", "cancelled", "failed"],
      default: "published",
      index: true,
    },

    scheduledFor: {
      type: Date,
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    publishAttempts: {
      type: Number,
      default: 0,
    },

    lastError: {
      type: String,
      default: null,
    },

    likesCount: {
      type: Number,
      default: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },

    savesCount: {
      type: Number,
      default: 0,
    },

    sharesCount: {
      type: Number,
      default: 0,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ status: 1, scheduledFor: 1 });

export default mongoose.model("Post", postSchema);
