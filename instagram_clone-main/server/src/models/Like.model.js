import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

/**
 * One user can like one post only once
 */
likeSchema.index(
  {
    post: 1,
    user: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model("Like", likeSchema);