import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getLanguage,
  requestOtp,
  resendOtp,
  verifyOtp,
} from "../controllers/language.controller.js";

const router = express.Router();

router.use(protect);

router.get("/", getLanguage);
router.post("/otp", requestOtp);
router.post("/otp/resend", resendOtp);
router.post("/verify", verifyOtp);

export default router;
