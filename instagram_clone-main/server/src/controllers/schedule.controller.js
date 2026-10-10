import Post from "../models/Post.model.js";
import { checkPostLimit } from "../services/plan.service.js";

// A user may keep at most this many posts waiting to be published.
const MAX_SCHEDULED_PER_USER = 2;

// Shared validation for "when can this post go live". Returns an error message
// string, or null when the time is acceptable.
function validateScheduleTime(scheduledFor) {
  if (!scheduledFor) return "A scheduled date and time is required.";
  const when = new Date(scheduledFor);
  if (Number.isNaN(when.getTime())) return "Invalid scheduled date.";
  if (when.getTime() <= Date.now())
    return "Scheduled time must be in the future.";
  return null;
}

// Creates a post that stays hidden until the scheduler publishes it.
export const createScheduledPost = async (req, res) => {
  try {
    const { caption, location, media, taggedUsers, visibility, scheduledFor } =
      req.body;

    if (!media || media.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      });
    }

    const timeError = validateScheduleTime(scheduledFor);
    if (timeError) {
      return res.status(400).json({ success: false, message: timeError });
    }

    // Max 2 pending scheduled posts per user.
    const pending = await Post.countDocuments({
      user: req.user._id,
      status: "scheduled",
      isDeleted: false,
    });
    if (pending >= MAX_SCHEDULED_PER_USER) {
      return res.status(403).json({
        success: false,
        message: `You can schedule at most ${MAX_SCHEDULED_PER_USER} posts at a time. Cancel or wait for one to publish first.`,
      });
    }

    // Respect the subscription posting quota (scheduled posts count too).
    const limit = await checkPostLimit(req.user);
    if (!limit.allowed) {
      return res.status(limit.status).json({
        success: false,
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
      taggedUsers,
      visibility,
      status: "scheduled",
      scheduledFor: new Date(scheduledFor),
    });

    res.status(201).json({
      success: true,
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
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (post.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled posts can be edited.",
      });
    }

    const { caption, location, media, taggedUsers, visibility, scheduledFor } =
      req.body;

    if (media !== undefined) {
      if (!Array.isArray(media) || media.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please upload at least one image",
        });
      }
      post.media = media;
    }
    if (caption !== undefined) post.caption = caption;
    if (location !== undefined) post.location = location;
    if (taggedUsers !== undefined) post.taggedUsers = taggedUsers;
    if (visibility !== undefined) post.visibility = visibility;

    if (scheduledFor !== undefined) {
      const timeError = validateScheduleTime(scheduledFor);
      if (timeError) {
        return res.status(400).json({ success: false, message: timeError });
      }
      post.scheduledFor = new Date(scheduledFor);
    }

    post.isEdited = true;
    await post.save();

    res.status(200).json({
      success: true,
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
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (post.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled posts can be cancelled.",
      });
    }

    post.status = "cancelled";
    await post.save();

    res.status(200).json({
      success: true,
      message: "Scheduled post cancelled",
      post,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { MAX_SCHEDULED_PER_USER };
