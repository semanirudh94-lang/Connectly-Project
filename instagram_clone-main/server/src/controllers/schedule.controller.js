import Post from "../models/Post.model.js";
import { checkPostLimit } from "../services/plan.service.js";
import { resolveHashtags, normalizeHashtags } from "../utils/hashtags.js";
import { sanitizeTaggedUsers } from "../utils/taggedUsers.js";

// A user may keep at most this many posts waiting to be published.
const MAX_SCHEDULED_PER_USER = 2;

// Shared validation for "when can this post go live". Returns an error code
// string, or null when the time is acceptable (the client translates it).
function validateScheduleTime(scheduledFor) {
  if (!scheduledFor) return "schedule_time_required";
  const when = new Date(scheduledFor);
  if (Number.isNaN(when.getTime())) return "schedule_time_invalid";
  if (when.getTime() <= Date.now()) return "schedule_time_past";
  return null;
}

// English fallbacks so the API stays readable for non-translated clients.
const SCHEDULE_TIME_TEXT = {
  schedule_time_required: "A scheduled date and time is required.",
  schedule_time_invalid: "Invalid scheduled date.",
  schedule_time_past: "Scheduled time must be in the future.",
};

const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

// Creates a post that stays hidden until the scheduler publishes it.
export const createScheduledPost = async (req, res) => {
  try {
    const { caption, location, media, taggedUsers, visibility, scheduledFor } =
      req.body;
    if (!media || media.length === 0) {
      return fail(res, 400, "media_required", "Please upload at least one image");
    }

    const timeError = validateScheduleTime(scheduledFor);
    if (timeError) {
      return fail(res, 400, timeError, SCHEDULE_TIME_TEXT[timeError]);
    }

    // Max 2 pending scheduled posts per user.
    const pending = await Post.countDocuments({
      user: req.user._id,
      status: "scheduled",
      isDeleted: false,
    });
    if (pending >= MAX_SCHEDULED_PER_USER) {
      return fail(
        res,
        403,
        "schedule_limit_reached",
        `You can schedule at most ${MAX_SCHEDULED_PER_USER} posts at a time. Cancel or wait for one to publish first.`,
        { max: MAX_SCHEDULED_PER_USER },
      );
    }

    // Respect the subscription posting quota (scheduled posts count too).
    const limit = await checkPostLimit(req.user);
    if (!limit.allowed) {
      return res.status(limit.status).json({
        success: false,
        code: limit.code,
        message: limit.message,
        plan: limit.usage.activePlan,
        limit: limit.usage.limit,
        used: limit.usage.used,
      });
    }

    const post = await Post.create({
      user: req.user._id,
      caption,
      location,
      media,
      taggedUsers: await sanitizeTaggedUsers(taggedUsers),
      hashtags: resolveHashtags(req.body),
      visibility,
      status: "scheduled",
      scheduledFor: new Date(scheduledFor),
    });

    res.status(201).json({
      success: true,
      code: "schedule_created",
      message: "Post scheduled successfully",
      post,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Lists the caller's scheduled/cancelled/failed posts (never other users').
export const getMyScheduledPosts = async (req, res) => {
  try {
    const status = req.query.status;
    const filter = { user: req.user._id, isDeleted: false };
    if (status && status !== "all") filter.status = status;
    else filter.status = { $in: ["scheduled", "cancelled", "failed"] };

    const posts = await Post.find(filter).sort({ scheduledFor: 1 });

    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: load a post owned by the caller that is still editable (scheduled).
async function loadEditableScheduledPost(id, userId) {
  const post = await Post.findOne({
    _id: id,
    user: userId,
    isDeleted: false,
  });
  return post;
}

// Edits content and/or reschedules a pending post.
export const updateScheduledPost = async (req, res) => {
  try {
    const post = await loadEditableScheduledPost(req.params.id, req.user._id);
    if (!post) {
      return fail(res, 404, "post_not_found", "Post not found");
    }
    if (post.status !== "scheduled") {
      return fail(
        res,
        400,
        "schedule_not_editable",
        "Only scheduled posts can be edited.",
      );
    }

    const { caption, location, media, taggedUsers, visibility, scheduledFor } =
      req.body;

    if (media !== undefined) {
      if (!Array.isArray(media) || media.length === 0) {
        return fail(res, 400, "media_required", "Please upload at least one image");
      }
      post.media = media;
    }
    if (caption !== undefined) post.caption = caption;
    if (location !== undefined) post.location = location;
    if (taggedUsers !== undefined)
      post.taggedUsers = await sanitizeTaggedUsers(taggedUsers);
    if (visibility !== undefined) post.visibility = visibility;

    if (req.body.hashtags !== undefined) {
      post.hashtags = normalizeHashtags(req.body.hashtags);
    } else if (caption !== undefined) {
      post.hashtags = resolveHashtags({ caption });
    }

    if (scheduledFor !== undefined) {
      const timeError = validateScheduleTime(scheduledFor);
      if (timeError) {
        return fail(res, 400, timeError, SCHEDULE_TIME_TEXT[timeError]);
      }
      post.scheduledFor = new Date(scheduledFor);
    }

    post.isEdited = true;
    await post.save();

    res.status(200).json({
      success: true,
      code: "schedule_updated",
      message: "Scheduled post updated",
      post,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Cancels a pending post so it never publishes.
export const cancelScheduledPost = async (req, res) => {
  try {
    const post = await loadEditableScheduledPost(req.params.id, req.user._id);
    if (!post) {
      return fail(res, 404, "post_not_found", "Post not found");
    }
    if (post.status !== "scheduled") {
      return fail(
        res,
        400,
        "schedule_not_cancellable",
        "Only scheduled posts can be cancelled.",
      );
    }

    post.status = "cancelled";
    await post.save();

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

export { MAX_SCHEDULED_PER_USER };
