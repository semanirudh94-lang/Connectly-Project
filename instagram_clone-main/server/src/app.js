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
import reportRoutes from "./routes/report.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
dotenv.config();
const app = express();

// Behind a proxy (Render/Vercel/NGINX) req.ip would otherwise be the proxy's
// address, which would make every Login History entry look identical.
app.set("trust proxy", true);

// Local dev origins plus whatever frontend is deployed (CLIENT_URL is also what
// socket.io trusts), so a new deployment only needs an env change. Comma-
// separated values let one service serve production and preview URLs.
const corsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

// The Razorpay webhook must verify the HMAC over the RAW bytes, so this path is
// parsed as a Buffer before the JSON body parser can consume it.
app.use(
  "/api/subscription/webhook",
  express.raw({ type: () => true }),
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
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Instagram Clone API is running 🚀",
  });
});
export default app;
