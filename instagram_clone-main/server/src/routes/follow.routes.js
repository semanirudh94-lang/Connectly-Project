import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { followUser, getFollowingUsers, unfollowUser } from "../controllers/follow.controller.js";

const router = express.Router();

router.post("/:id", protect, followUser);
router.delete("/:id", protect, unfollowUser);
router.get("/following", protect, getFollowingUsers);

export default router;
