import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createComment,
  getPostComments,
  deleteComment,
} from "../controllers/comment.controller.js";

const router = express.Router();

router.post("/:postId", protect, createComment);
router.get("/:postId", protect, getPostComments);
router.delete("/:id", protect, deleteComment);

export default router;
