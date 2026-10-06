import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import postRoutes from "./routes/post.routes.js";
import followRoutes from "./routes/follow.routes.js";
import likesRoutes from "./routes/like.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import conversationRoutes from "./routes/conv.route.js";
import uploadRoutes from "./routes/upload.routes.js";
import storyRoutes from "./routes/story.routes.js";
import highlightRoutes from "./routes/highlight.routes.js";
import closeFriendsRoutes from "./routes/closeFriends.routes.js";
import languageRoutes from "./routes/language.routes.js";
dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://instagram-clone-pink.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/conversation", conversationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/highlights", highlightRoutes);
app.use("/api/close-friends", closeFriendsRoutes);
app.use("/api/language", languageRoutes);
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Instagram Clone API is running 🚀",
  });
});
export default app;
