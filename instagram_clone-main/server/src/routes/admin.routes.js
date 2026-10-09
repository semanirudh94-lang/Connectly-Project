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
  listStories,
  updateStory,
  deleteStory,
  listSubscriptions,
  updateSubscription,
  deleteSubscription,
  listReports,
  updateReport,
  deleteReport,
  listComments,
  deleteComment,
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

// Stories (read/update/delete)
router.get("/stories", listStories);
router.put("/stories/:id", updateStory);
router.delete("/stories/:id", deleteStory);

// Subscriptions (read/update/delete)
router.get("/subscriptions", listSubscriptions);
router.put("/subscriptions/:id", updateSubscription);
router.delete("/subscriptions/:id", deleteSubscription);

// Reports (read/update/delete)
router.get("/reports", listReports);
router.put("/reports/:id", updateReport);
router.delete("/reports/:id", deleteReport);

// Comments (read/delete)
router.get("/comments", listComments);
router.delete("/comments/:id", deleteComment);

// Audit log (read-only)
router.get("/audit-logs", listAuditLogs);

export default router;
