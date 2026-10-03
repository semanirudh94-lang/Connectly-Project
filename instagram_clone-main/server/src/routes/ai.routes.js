import express from "express";

import { protect } from "../middleware/auth.middleware.js";
import { generateCaption ,rewriteMessage} from "../controllers/ai.js";

const router = express.Router();

router.post("/caption", protect, generateCaption);
router.post("/rewrite", protect, rewriteMessage);
export default router;
