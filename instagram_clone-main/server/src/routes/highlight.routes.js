import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createHighlight,
  getHighlights,
  getHighlightDetail,
  addToHighlight,
  removeFromHighlight,
  updateHighlight,
  deleteHighlight,
} from "../controllers/highlight.controller.js";

const router = express.Router();

router.post("/", protect, createHighlight);
router.get("/user/:username", protect, getHighlights);
router.get("/:id", protect, getHighlightDetail);
router.post("/:id/stories", protect, addToHighlight);
router.delete("/:id/stories/:storyId", protect, removeFromHighlight);
router.put("/:id", protect, updateHighlight);
router.delete("/:id", protect, deleteHighlight);

export default router;
