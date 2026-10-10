import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/admin.middleware.js";
import {
  getStats,
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  listPosts,
  updatePost,
  deletePost,
  listScheduledPosts,
  updateScheduledPost,
  cancelScheduledPost,
  listStories,
  updateStory,
  deleteStory,
  listSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  listReports,
  updateReport,
  deleteReport,
  listComments,
  updateComment,
  deleteComment,
  listPublishErrors,
  listAuditLogs,
} from "../controllers/admin.controller.js";

const router = express.Router();

// Every admin route requires an authenticated administrator.
router.use(protect, adminOnly);

// Overview
router.get("/stats", getStats);

// Users (full CRUD)
router.get("/users", listUsers);
router.post("/users", createUser);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Posts (read/update/delete)
router.get("/posts", listPosts);
router.put("/posts/:id", updatePost);
router.delete("/posts/:id", deletePost);

// Scheduled posts (Task 6 monitoring + admin reschedule/cancel)
router.get("/scheduled-posts", listScheduledPosts);
router.put("/scheduled-posts/:id", updateScheduledPost);
router.delete("/scheduled-posts/:id", cancelScheduledPost);

// Scheduler failure log (read-only)
router.get("/publish-errors", listPublishErrors);

// Stories (read/update/delete)
router.get("/stories", listStories);
router.put("/stories/:id", updateStory);
router.delete("/stories/:id", deleteStory);

// Subscriptions (full CRUD; create grants a plan manually)
router.get("/subscriptions", listSubscriptions);
router.post("/subscriptions", createSubscription);
router.put("/subscriptions/:id", updateSubscription);
router.delete("/subscriptions/:id", deleteSubscription);

// Reports (read/update/delete)
router.get("/reports", listReports);
router.put("/reports/:id", updateReport);
router.delete("/reports/:id", deleteReport);

// Comments (read/update/delete)
router.get("/comments", listComments);
router.put("/comments/:id", updateComment);
router.delete("/comments/:id", deleteComment);

// Audit log (read-only)
router.get("/audit-logs", listAuditLogs);

export default router;
