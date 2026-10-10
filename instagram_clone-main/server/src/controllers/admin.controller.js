import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import Post from "../models/Post.model.js";
import Story from "../models/Story.model.js";
import Subscription from "../models/Subscription.model.js";
import Report from "../models/Report.model.js";
import Comment from "../models/Comment.model.js";
import Like from "../models/Like.model.js";
import AuditLog from "../models/AuditLog.model.js";
import PublishErrorLog from "../models/PublishErrorLog.model.js";
import { getPlan, isValidPlan, planEndDate } from "../config/plans.js";
import { writeAudit } from "../utils/audit.js";

// ───────────────────────── shared helpers ─────────────────────────

// Escape user input before it reaches a RegExp (prevents ReDoS / injection).
const escapeRegex = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripSecret = (u) => {
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// { from, to } → a $gte/$lte range on the given field (default createdAt).
function dateRange(query) {
  const range = {};
  if (query.from) range.$gte = new Date(query.from);
  if (query.to) range.$lte = new Date(query.to);
  return Object.keys(range).length ? range : null;
}

function parseSort(query, allowed, fallback = "createdAt") {
  const field = allowed.includes(query.sort) ? query.sort : fallback;
  const dir = query.order === "asc" ? 1 : -1;
  return { [field]: dir };
}

const toBool = (v) => (v === "true" ? true : v === "false" ? false : undefined);

async function paginate(model, filter, sort, { page, limit, skip }, populate) {
  const [items, total] = await Promise.all([
    populate
      ? model.find(filter).populate(populate).sort(sort).skip(skip).limit(limit)
      : model.find(filter).sort(sort).skip(skip).limit(limit),
    model.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

const okList = (res, data) => res.status(200).json({ success: true, ...data });

// ───────────────────────── stats ─────────────────────────

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalPosts,
      totalStories,
      totalComments,
      subsByPlanRaw,
      activeSubs,
      reportsByStatusRaw,
      totalReports,
      engagement,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ role: "admin" }),
      Post.countDocuments({ isDeleted: false }),
      Story.countDocuments({ isDeleted: false }),
      Comment.countDocuments({ isDeleted: false }),
      Subscription.aggregate([
        { $group: { _id: "$plan", count: { $sum: 1 } } },
      ]),
      Subscription.countDocuments({ status: "active" }),
      Report.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Report.countDocuments(),
      Post.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            likes: { $sum: "$likesCount" },
            comments: { $sum: "$commentsCount" },
            saves: { $sum: "$savesCount" },
            shares: { $sum: "$sharesCount" },
          },
        },
      ]),
    ]);

    const subsByPlan = { bronze: 0, silver: 0, gold: 0 };
    subsByPlanRaw.forEach((r) => (subsByPlan[r._id] = r.count));
    const reportsByStatus = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
    };
    reportsByStatusRaw.forEach((r) => (reportsByStatus[r._id] = r.count));
    const eng = engagement[0] || {};

    res.status(200).json({
      success: true,
      stats: {
        users: { total: totalUsers, active: activeUsers, admins: adminUsers },
        posts: totalPosts,
        stories: totalStories,
        comments: totalComments,
        subscriptions: {
          active: activeSubs,
          byPlan: subsByPlan,
        },
        reports: { total: totalReports, byStatus: reportsByStatus },
        engagement: {
          likes: eng.likes || 0,
          comments: eng.comments || 0,
          saves: eng.saves || 0,
          shares: eng.shares || 0,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────── users ─────────────────────────

// GET /api/admin/users
export const listUsers = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};
    if (q.search) {
      const rx = new RegExp(escapeRegex(q.search), "i");
      filter.$or = [{ username: rx }, { email: rx }, { fullName: rx }];
    }
    if (q.role) filter.role = q.role;
    if (q.status) filter.status = q.status;
    if (q.plan) filter.plan = q.plan;
    const verified = toBool(q.isVerified);
    if (verified !== undefined) filter.isVerified = verified;
    const range = dateRange(q);
    if (range) filter.createdAt = range;

    const sort = parseSort(q, ["createdAt", "username", "followersCount"]);
    const data = await paginate(
      User,
      filter,
      sort,
      parsePagination(q),
      null,
    );
    okList(res, { ...data, items: data.items.map(stripSecret) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/users/:id
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, user: stripSecret(user) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/users
export const createUser = async (req, res) => {
  try {
    const { username, fullName, email, password, role, plan } = req.body;
    if (!username || !fullName || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "username, fullName, email, password are required" });
    }
    const exists = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Email or username already in use" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      fullName,
      email,
      password: hashed,
      role: role === "admin" ? "admin" : "user",
      plan: plan || "free",
    });
    await writeAudit(req, {
      action: "user.create",
      entityType: "user",
      entityId: user._id,
      summary: `Created user ${user.username}`,
    });
    res.status(201).json({ success: true, user: stripSecret(user) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const allowed = [
      "fullName",
      "username",
      "email",
      "role",
      "status",
      "isVerified",
      "plan",
      "bio",
      "accountType",
    ];
    const before = {};
    const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined && req.body[key] !== user[key]) {
        before[key] = user[key];
        user[key] = req.body[key];
        changes[key] = req.body[key];
      }
    }
    await user.save();
    await writeAudit(req, {
      action: "user.update",
      entityType: "user",
      entityId: user._id,
      summary: `Updated user ${user.username}`,
      changes: { before, after: changes },
    });
    res.status(200).json({ success: true, user: stripSecret(user) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/users/:id  (hard delete + cascade their content)
export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot delete your own account" });
    }
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    await Promise.all([
      Post.deleteMany({ user: user._id }),
      Comment.deleteMany({ user: user._id }),
      Story.deleteMany({ user: user._id }),
      Like.deleteMany({ user: user._id }),
      user.deleteOne(),
    ]);
    await writeAudit(req, {
      action: "user.delete",
      entityType: "user",
      entityId: user._id,
      summary: `Deleted user ${user.username} and their content`,
    });
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────── posts ─────────────────────────

// GET /api/admin/posts
export const listPosts = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};
    if (q.visibility) filter.visibility = q.visibility;
    const del = toBool(q.isDeleted);
    if (del !== undefined) filter.isDeleted = del;
    const arch = toBool(q.isArchived);
    if (arch !== undefined) filter.isArchived = arch;
    if (q.user) filter.user = q.user;
    const range = dateRange(q);
    if (range) filter.createdAt = range;
    if (q.search) {
      const rx = new RegExp(escapeRegex(q.search), "i");
      // search by caption text OR by owner username
      const owners = await User.find({ username: rx }).select("_id");
      filter.$or = [
        { caption: rx },
        { user: { $in: owners.map((o) => o._id) } },
      ];
    }

    const sort = parseSort(q, ["createdAt", "likesCount", "commentsCount"]);
    const data = await paginate(
      Post,
      filter,
      sort,
      parsePagination(q),
      { path: "user", select: "username fullName profilePicture" },
    );
    okList(res, data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/posts/:id
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(404).json({ success: false, message: "Post not found" });
    const allowed = ["visibility", "caption", "isArchived", "isDeleted"];
    const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        post[key] = req.body[key];
        changes[key] = req.body[key];
      }
    }
    await post.save();
    await writeAudit(req, {
      action: "post.update",
      entityType: "post",
      entityId: post._id,
      summary: `Updated post ${post._id}`,
      changes,
    });
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/posts/:id  (hard delete + its comments/likes)
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(404).json({ success: false, message: "Post not found" });
    await Promise.all([
      Comment.deleteMany({ post: post._id }),
      Like.deleteMany({ post: post._id }),
      post.deleteOne(),
    ]);
    await writeAudit(req, {
      action: "post.delete",
      entityType: "post",
      entityId: post._id,
      summary: `Deleted post ${post._id}`,
    });
    res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────── scheduled posts ─────────────────────────

// GET /api/admin/scheduled-posts  (Task 6 monitoring: filter by status, search
// by caption/owner, and range-filter on the scheduled publish time)
export const listScheduledPosts = async (req, res) => {
  try {
    const q = req.query;
    const filter = { isDeleted: false };

    // Only surface posts that are part of the scheduling lifecycle.
    const SCHEDULE_STATUSES = ["scheduled", "published", "cancelled", "failed"];
    if (q.status && SCHEDULE_STATUSES.includes(q.status)) {
      filter.status = q.status;
    } else {
      filter.status = { $in: SCHEDULE_STATUSES };
      // By default hide plain published posts unless explicitly requested,
      // so this view focuses on scheduled/cancelled/failed.
      if (!q.status) filter.status = { $in: ["scheduled", "cancelled", "failed"] };
    }

    if (q.user) filter.user = q.user;
    if (q.search) {
      const rx = new RegExp(escapeRegex(q.search), "i");
      const owners = await User.find({ username: rx }).select("_id");
      filter.$or = [
        { caption: rx },
        { user: { $in: owners.map((o) => o._id) } },
      ];
    }
    // Date range applies to the scheduled publish time.
    const range = dateRange(q);
    if (range) filter.scheduledFor = range;

    const sort = parseSort(q, ["scheduledFor", "createdAt", "status"]);
    const data = await paginate(
      Post,
      filter,
      sort,
      parsePagination(q),
      { path: "user", select: "username fullName profilePicture" },
    );
    okList(res, data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/scheduled-posts/:id  (admin can reschedule or force-cancel)
export const updateScheduledPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(404).json({ success: false, message: "Post not found" });

    const allowed = ["status", "scheduledFor"];
    const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        post[key] = req.body[key];
        changes[key] = req.body[key];
      }
    }
    await post.save();
    await writeAudit(req, {
      action: "scheduledPost.update",
      entityType: "post",
      entityId: post._id,
      summary: `Admin updated scheduled post ${post._id}`,
      changes,
    });
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/scheduled-posts/:id
// Cancels a pending post so the scheduler can never publish it. A post that
// already went live is removed through the normal posts endpoint instead.
export const cancelScheduledPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(404).json({ success: false, message: "Post not found" });
    if (post.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        code: "schedule_not_cancellable",
        message: "Only scheduled posts can be cancelled.",
      });
    }

    post.status = "cancelled";
    await post.save();

    await writeAudit(req, {
      action: "scheduledPost.cancel",
      entityType: "post",
      entityId: post._id,
      summary: `Admin cancelled scheduled post ${post._id}`,
      changes: { after: { status: "cancelled" } },
    });
    res.status(200).json({
      success: true,
      code: "schedule_cancelled",
      message: "Scheduled post cancelled",
      post,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────── stories ─────────────────────────

// GET /api/admin/stories
export const listStories = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};
    if (q.privacy) filter.privacy = q.privacy;
    const active = toBool(q.isActive);
    if (active !== undefined) filter.isActive = active;
    const del = toBool(q.isDeleted);
    if (del !== undefined) filter.isDeleted = del;
    if (q.user) filter.user = q.user;
    const range = dateRange(q);
    if (range) filter.createdAt = range;
    if (q.search) {
      // Stories have no caption, so a keyword matches the owner or the media URL.
      const rx = new RegExp(escapeRegex(q.search), "i");
      const owners = await User.find({ $or: [{ username: rx }, { fullName: rx }] }).select("_id");
      filter.$or = [
        { "media.url": rx },
        { user: { $in: owners.map((o) => o._id) } },
      ];
    }

    const sort = parseSort(q, ["createdAt", "viewsCount", "expiresAt"]);
    const data = await paginate(
      Story,
      filter,
      sort,
      parsePagination(q),
      { path: "user", select: "username fullName profilePicture" },
    );
    okList(res, data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/stories/:id
export const updateStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story)
      return res.status(404).json({ success: false, message: "Story not found" });
    const allowed = ["privacy", "isActive", "isArchived", "isDeleted"];
    const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        story[key] = req.body[key];
        changes[key] = req.body[key];
      }
    }
    await story.save();
    await writeAudit(req, {
      action: "story.update",
      entityType: "story",
      entityId: story._id,
      summary: `Updated story ${story._id}`,
      changes,
    });
    res.status(200).json({ success: true, story });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/stories/:id
export const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story)
      return res.status(404).json({ success: false, message: "Story not found" });
    await story.deleteOne();
    await writeAudit(req, {
      action: "story.delete",
      entityType: "story",
      entityId: story._id,
      summary: `Deleted story ${story._id}`,
    });
    res.status(200).json({ success: true, message: "Story deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────── subscriptions ─────────────────────────

// GET /api/admin/subscriptions
export const listSubscriptions = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};
    if (q.plan) filter.plan = q.plan;
    if (q.status) filter.status = q.status;
    if (q.user) filter.user = q.user;
    const range = dateRange(q);
    if (range) filter.createdAt = range;

    const sort = parseSort(q, ["createdAt", "endDate", "amount"]);
    const data = await paginate(
      Subscription,
      filter,
      sort,
      parsePagination(q),
      { path: "user", select: "username fullName email" },
    );
    okList(res, data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/subscriptions
// Grants a plan directly (support/comping cases) with no payment attempt. The
// orderId/paymentId are marked as manual so reports never mistake these for
// real transactions.
export const createSubscription = async (req, res) => {
  try {
    const { user: userId, plan, days } = req.body;
    if (!userId || !isValidPlan(plan) || plan === "free") {
      return res.status(400).json({
        success: false,
        code: "plan_invalid",
        message: "Provide a user and a paid plan (bronze, silver or gold).",
      });
    }
    const target = await User.findById(userId);
    if (!target)
      return res.status(404).json({ success: false, message: "User not found" });

    const planDef = getPlan(plan);
    const now = new Date();
    const endDate = planEndDate(plan, now);
    if (Number.isFinite(parseInt(days)) && parseInt(days) > 0) {
      endDate.setDate(now.getDate() + parseInt(days));
    }

    await Subscription.updateMany(
      { user: target._id, status: { $in: ["active", "cancellation_scheduled"] } },
      { $set: { status: "expired" } },
    );

    const subscription = await Subscription.create({
      user: target._id,
      plan,
      orderId: `admin_${Date.now()}`,
      paymentId: `admin_${Date.now()}`,
      amount: planDef.amountPaise,
      currency: planDef.currency,
      status: "active",
      startDate: now,
      endDate,
      nextRenewalDate: endDate,
      autoRenew: false,
    });

    await User.findByIdAndUpdate(target._id, {
      plan,
      planExpiresAt: endDate,
      planPeriodStart: now,
    });

    await writeAudit(req, {
      action: "subscription.create",
      entityType: "subscription",
      entityId: subscription._id,
      summary: `Granted ${planDef.name} plan to ${target.username} until ${endDate.toDateString()}`,
      changes: { after: { plan, endDate } },
    });
    res.status(201).json({ success: true, subscription });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/subscriptions/:id
export const updateSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    const allowed = ["status", "plan", "cancelAtPeriodEnd", "endDate", "nextRenewalDate"];
    const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sub[key] = req.body[key];
        changes[key] = req.body[key];
      }
    }
    await sub.save();
    await writeAudit(req, {
      action: "subscription.update",
      entityType: "subscription",
      entityId: sub._id,
      summary: `Updated subscription ${sub._id}`,
      changes,
    });
    res.status(200).json({ success: true, subscription: sub });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/subscriptions/:id
export const deleteSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    await sub.deleteOne();
    await writeAudit(req, {
      action: "subscription.delete",
      entityType: "subscription",
      entityId: sub._id,
      summary: `Deleted subscription ${sub._id}`,
    });
    res.status(200).json({ success: true, message: "Subscription deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────── reports ─────────────────────────

// GET /api/admin/reports
export const listReports = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};
    if (q.status) filter.status = q.status;
    if (q.targetType) filter.targetType = q.targetType;
    if (q.reason) filter.reason = q.reason;
    const range = dateRange(q);
    if (range) filter.createdAt = range;

    const sort = parseSort(q, ["createdAt", "status"]);
    const data = await paginate(
      Report,
      filter,
      sort,
      parsePagination(q),
      { path: "reporter", select: "username fullName" },
    );
    okList(res, data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/reports/:id
export const updateReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });
    const changes = {};
    if (req.body.status !== undefined) {
      report.status = req.body.status;
      changes.status = req.body.status;
      report.reviewedBy = req.user._id;
      report.reviewedAt = new Date();
    }
    if (req.body.description !== undefined) {
      report.description = req.body.description;
      changes.description = req.body.description;
    }
    await report.save();
    await writeAudit(req, {
      action: "report.update",
      entityType: "report",
      entityId: report._id,
      summary: `Set report ${report._id} to ${report.status}`,
      changes,
    });
    res.status(200).json({ success: true, report });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/reports/:id
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });
    await report.deleteOne();
    await writeAudit(req, {
      action: "report.delete",
      entityType: "report",
      entityId: report._id,
      summary: `Deleted report ${report._id}`,
    });
    res.status(200).json({ success: true, message: "Report deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────── comments ─────────────────────────

// GET /api/admin/comments
export const listComments = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};
    const del = toBool(q.isDeleted);
    if (del !== undefined) filter.isDeleted = del;
    if (q.post) filter.post = q.post;
    if (q.user) filter.user = q.user;
    const range = dateRange(q);
    if (range) filter.createdAt = range;
    if (q.search) {
      filter.text = new RegExp(escapeRegex(q.search), "i");
    }

    const sort = parseSort(q, ["createdAt", "likesCount"]);
    const data = await paginate(
      Comment,
      filter,
      sort,
      parsePagination(q),
      [
        { path: "user", select: "username fullName" },
        { path: "post", select: "caption" },
      ],
    );
    okList(res, data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/comments/:id  (moderate the text, or hide/unhide it)
export const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });

    const changes = {};
    if (req.body.text !== undefined) {
      const text = String(req.body.text).trim();
      if (!text) {
        return res
          .status(400)
          .json({ success: false, message: "Comment text cannot be empty" });
      }
      changes.text = { before: comment.text, after: text };
      comment.text = text;
    }
    const del = toBool(req.body.isDeleted);
    if (del !== undefined) {
      changes.isDeleted = { before: comment.isDeleted, after: del };
      comment.isDeleted = del;
    }
    await comment.save();

    await writeAudit(req, {
      action: "comment.update",
      entityType: "comment",
      entityId: comment._id,
      summary: `Updated comment ${comment._id}`,
      changes,
    });
    res.status(200).json({ success: true, comment });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/comments/:id  (hard delete + fix post counter)
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    await comment.deleteOne();
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -1 },
    });
    await writeAudit(req, {
      action: "comment.delete",
      entityType: "comment",
      entityId: comment._id,
      summary: `Deleted comment ${comment._id}`,
    });
    res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/publish-errors  (Task 6 scheduler failure log)
export const listPublishErrors = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};
    if (q.post) filter.post = q.post;
    if (q.user) filter.user = q.user;
    const permanent = toBool(q.permanent);
    if (permanent !== undefined) filter.permanent = permanent;
    const range = dateRange(q);
    if (range) filter.createdAt = range;

    const sort = parseSort(q, ["createdAt", "attempt"]);
    const data = await paginate(
      PublishErrorLog,
      filter,
      sort,
      parsePagination(q),
      [
        { path: "post", select: "caption status scheduledFor" },
        { path: "user", select: "username fullName email" },
      ],
    );
    okList(res, data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────────────────── audit log ─────────────────────────

// GET /api/admin/audit-logs
export const listAuditLogs = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};
    if (q.entityType) filter.entityType = q.entityType;
    if (q.action) filter.action = q.action;
    if (q.admin) filter.admin = q.admin;
    const range = dateRange(q);
    if (range) filter.createdAt = range;

    const sort = parseSort(q, ["createdAt"]);
    const data = await paginate(
      AuditLog,
      filter,
      sort,
      parsePagination(q),
      { path: "admin", select: "username fullName" },
    );
    okList(res, data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
