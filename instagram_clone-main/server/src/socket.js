import { Server } from "socket.io";
import Conversation from "./models/Conversation.model.js";
import Message from "./models/message.model.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("setup", (userId) => {
      socket.join(userId.toString());
    });

    socket.on("join-conversation", (conversationId) => {
      socket.join(conversationId);
    });

    socket.on("leave-conversation", (conversationId) => {
      socket.leave(conversationId);
    });

    // SEND MESSAGE
    socket.on("send-message", async (data) => {
      try {
        const { conversationId, senderId, text, media } = data;

        const message = await Message.create({
          conversation: conversationId,
          sender: senderId,
          text,
          media,
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        const populatedMessage = await Message.findById(message._id).populate(
          "sender",
          "username fullName profilePicture",
        );

        io.to(conversationId).emit("receive-message", populatedMessage);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("typing", userId);
    });

    socket.on("stop-typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("stop-typing", userId);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected");
    });
  });
};

export { io };
