import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getPlans,
  getMySubscription,
  createSubscriptionOrder,
  verifyPayment,
  cancelSubscription,
} from "../controllers/subscription.controller.js";

const router = express.Router();

// Plans list is safe to expose to any logged-in user.
router.use(protect);

router.get("/plans", getPlans);
router.get("/me", getMySubscription);
router.post("/order", createSubscriptionOrder);
router.post("/verify", verifyPayment);
router.post("/cancel", cancelSubscription);

export default router;
