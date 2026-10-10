import { Server } from "socket.io";
import jwt from "jsonwebtoken";
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

    // The room a user joins must come from a verified token — a client-supplied
    // userId would let anyone subscribe to someone else's private events.
    socket.on("setup", (accessToken) => {
      try {
        const decoded = jwt.verify(String(accessToken || ""), process.env.JWT_SECRET);
        socket.data.userId = String(decoded.id);
        socket.join(socket.data.userId);
      } catch {
        socket.emit("unauthorized");
      }
    });

    socket.on("join-conversation", (conversationId) => {
      if (!socket.data.userId) return;
      socket.join(conversationId);
    });

    socket.on("leave-conversation", (conversationId) => {
      socket.leave(conversationId);
    });

    // SEND MESSAGE
    socket.on("send-message", async (data) => {
      try {
        const { conversationId, text, media } = data;

        if (!socket.data.userId) return;

        const member = await Conversation.findOne({
          _id: conversationId,
          participants: socket.data.userId,
        }).select("_id");
        if (!member) return;

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.data.userId,
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
