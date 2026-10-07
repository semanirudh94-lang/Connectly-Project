import express from "express";
import {
  getProfileByUsername,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  getLoginHistory,
  me,
  register,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/login/verify", verifyLoginOtp);
router.post("/login/resend", resendLoginOtp);
router.get("/me", protect, me);
// Must come before "/:username" so it is not captured as a profile lookup.
router.get("/login-history", protect, getLoginHistory);
router.get("/:username", protect, getProfileByUsername);

export default router;
