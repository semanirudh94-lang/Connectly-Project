import express from "express";
import {
  getProfileByUsername,
  login,
  me,
  register,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.get("/:username", protect, getProfileByUsername);

export default router;
