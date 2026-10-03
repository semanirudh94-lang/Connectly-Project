import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createPost,
  getPosts,
  getUserPosts,
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/", getPosts);
router.post("/", protect, createPost);
router.get("/user/:username", getUserPosts);

export default router;
