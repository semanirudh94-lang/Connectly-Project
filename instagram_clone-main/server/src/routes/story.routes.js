import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createStory,
  getFeed,
  getUserStories,
  recordView,
  reactToStory,
  replyToStory,
  deleteStory,
  getStoryAnalytics,
  getArchive,
} from "../controllers/story.controller.js";

const router = express.Router();

router.post("/", protect, createStory);
router.get("/feed", protect, getFeed);
router.get("/archive", protect, getArchive);
router.get("/user/:username", protect, getUserStories);
router.get("/:id/analytics", protect, getStoryAnalytics);
router.post("/:id/view", protect, recordView);
router.post("/:id/reaction", protect, reactToStory);
router.post("/:id/reply", protect, replyToStory);
router.delete("/:id", protect, deleteStory);

export default router;
