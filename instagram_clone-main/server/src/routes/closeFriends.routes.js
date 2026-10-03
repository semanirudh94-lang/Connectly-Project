import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getCloseFriends,
  addCloseFriend,
  removeCloseFriend,
} from "../controllers/closeFriends.controller.js";

const router = express.Router();

router.get("/", protect, getCloseFriends);
router.post("/:userId", protect, addCloseFriend);
router.delete("/:userId", protect, removeCloseFriend);

export default router;
