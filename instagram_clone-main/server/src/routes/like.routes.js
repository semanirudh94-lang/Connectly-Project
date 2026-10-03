import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { LikePost, UnLikePost } from "../controllers/like.controller.js";

const router = express.Router();

router.post("/:id", protect, LikePost);
router.delete("/:id", protect, UnLikePost);

export default router;
