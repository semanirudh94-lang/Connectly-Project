import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    isGroup: {
      type: Boolean,
      default: false,
    },

    groupName: {
      type: String,
      default: "",
    },

    groupImage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({
  participants: 1,
});

export default mongoose.model("Conversation", conversationSchema);
