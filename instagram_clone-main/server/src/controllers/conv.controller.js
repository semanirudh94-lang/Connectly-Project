import Conversation from "../models/Conversation.model.js";
import Message from "../models/message.model.js";
import { io } from "../socket.js";
export const createConversation = async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!Array.isArray(receiverId) || receiverId.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Receiver ids are required",
      });
    }
    const currentUserId = req.user._id.toString();
    const receierIds = [
      ...new Set(receiverId.filter((id) => id.toString() !== currentUserId)),
    ];
    if (!receierIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid Receiver",
      });
    }
    const exisitingconversation = await Conversation.find({
      isGroup: false,
      participants: currentUserId,
      $or: receierIds.map((id) => ({
        participants: id,
      })),
    })
      .populate("participants", "username fullName profilePicture isVerified")
      .populate("lastMessage");
    const existingReceiversids = new Set();
    exisitingconversation.forEach((conv) => {
      const otherUser = conv.participants.find(
        (user) => user._id.toString() !== currentUserId,
      );
      if (otherUser) {
        existingReceiversids.add(otherUser._id.toString());
      }
    });
    const conversationstocreate = receierIds
      .filter((id) => !existingReceiversids.has(id))
      .map((id) => ({ participants: [currentUserId, id] }));
    let newConversations = [];
    if (conversationstocreate.length) {
      const created = await Conversation.insertMany(conversationstocreate);
      newConversations = await Conversation.find({
        _id: {
          $in: created.map((c) => c._id),
        },
      })
        .populate("participants", "username fullName profilePicture isVerified")
        .populate("lastMessage");
    }
    return res.status(200).json({
      success: true,
      conversations: [...exisitingconversation, ...newConversations],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false,
    })
      .populate("sender", "username fullName profilePicture isVerified")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text = "", media = null } = req.body;

    if (!text && !media) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text,
      media,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "username fullName profilePicture isVerified",
    );

    io.to(conversationId).emit("receive-message", populatedMessage);

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const markMessagesSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: {
          $ne: req.user._id,
        },
        isSeen: false,
      },
      {
        isSeen: true,
        seenAt: new Date(),
      },
    );

    io.to(conversationId).emit("messages-seen", {
      conversationId,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
