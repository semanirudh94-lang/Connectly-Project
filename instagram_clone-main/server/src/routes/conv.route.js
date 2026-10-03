import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getMessages,
  sendMessage,
  markMessagesSeen,
  createConversation,
} from "../controllers/conv.controller.js";

const router = express.Router();

router.get("/:conversationId/messages", protect, getMessages);
router.post("/:conversationId/message", protect, sendMessage);
router.post("/", protect, createConversation);
router.put("/:conversationId/seen", protect, markMessagesSeen);

export default router;
