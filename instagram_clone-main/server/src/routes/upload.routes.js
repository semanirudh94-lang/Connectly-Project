import express from "express";
import multer from "multer";
import { protect } from "../middleware/auth.middleware.js";
import { uploadMedia } from "../controllers/upload.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB (video stories)
});

router.post("/", protect, upload.single("media"), uploadMedia);

export default router;
