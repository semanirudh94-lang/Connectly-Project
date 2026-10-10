import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { enforcePostLimit } from "../middleware/postLimit.middleware.js";
import {
  createPost,
  getPosts,
  getUserPosts,
} from "../controllers/post.controller.js";
import {
  createScheduledPost,
  getMyScheduledPosts,
  updateScheduledPost,
  cancelScheduledPost,
} from "../controllers/schedule.controller.js";

const router = express.Router();

router.get("/", getPosts);
router.post("/", protect, enforcePostLimit, createPost);
router.get("/user/:username", getUserPosts);

// Post scheduling (Task 6). All behind auth. createScheduledPost runs its own
// plan-quota check so it does not use the enforcePostLimit middleware.
router.get("/scheduled/me", protect, getMyScheduledPosts);
router.post("/scheduled", protect, createScheduledPost);
router.put("/scheduled/:id", protect, updateScheduledPost);
router.delete("/scheduled/:id", protect, cancelScheduledPost);

export default router;
