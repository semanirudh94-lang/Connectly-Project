import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    website: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 150 },
    profilePicture: { type: String, default: "" },
    accountType: {
      type: String,
      default: "public",
      enum: ["private", "public"],
    },
    gender: {
      type: String,
      default: "other",
      enum: ["male", "female", "other"],
    },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    PostCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    closeFriends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    refreshToken: {
      type: String,
      default: "",
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("User", userSchema);
