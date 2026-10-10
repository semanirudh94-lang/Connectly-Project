import Story from "../models/Story.model.js";
import StoryView from "../models/StoryView.model.js";
import StoryReaction from "../models/StoryReaction.model.js";
import StoryReply from "../models/StoryReply.model.js";
import Follow from "../models/Follow.model.js";
import User from "../models/User.model.js";
import { io } from "../socket.js";

const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const USER_FIELDS = "username fullName profilePicture isVerified";

// Emit a real-time analytics update to the story owner's personal socket room.
// The owner joins this room via the existing "setup" event (socket.join(userId)).
const emitAnalytics = async (ownerId, storyId, kind, actor, meta = {}) => {
  try {
    const counts = await Story.findById(storyId).select(
      "viewsCount completedCount reactionsCount repliesCount",
    );
    io.to(ownerId.toString()).emit("story-analytics", {
      storyId: storyId.toString(),
      kind, // 'view' | 'completed' | 'reaction' | 'reply'
      counts,
      actor,
      meta,
      at: new Date(),
    });
  } catch (err) {
    console.log("emitAnalytics failed:", err.message);
  }
};

// ---------------------------------------------------------------------------
// CREATE STORY (supports multiple media in one request)
// ---------------------------------------------------------------------------
export const createStory = async (req, res) => {
  try {
    const { media, privacy = "public" } = req.body;
    const mediaArr = Array.isArray(media) ? media : [media];

    if (!mediaArr.length) {
      return res.status(400).json({
        success: false,
        code: "story_media_required",
        message: "At least one media is required",
      });
    }
    for (const m of mediaArr) {
      if (!m?.url || !m?.type) {
        return res.status(400).json({
          success: false,
          code: "story_media_invalid",
          message: "Each media needs a url and type",
        });
      }
    }
    if (!["public", "followers", "close_friends"].includes(privacy)) {
      return res.status(400).json({
        success: false,
        code: "story_privacy_invalid",
        message: "Invalid privacy",
      });
    }

    const expiresAt = new Date(Date.now() + STORY_TTL_MS);
    const docs = await Story.insertMany(
      mediaArr.map((m) => ({
        user: req.user._id,
        media: {
          url: m.url,
          type: m.type,
          publicId: m.publicId,
          width: m.width,
          height: m.height,
          duration: m.duration,
        },
        privacy,
        expiresAt,
        isActive: true,
      })),
    );

    res.status(201).json({ success: true, stories: docs });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// FEED: active stories from me + people I follow, privacy-aware, grouped,
// with a `seen` flag per story for the current viewer.
// ---------------------------------------------------------------------------
export const getFeed = async (req, res) => {
  try {
    const me = req.user._id;
    const meStr = me.toString();

    const follows = await Follow.find({ follower: me }).select("following");
    const followingIds = follows.map((f) => f.following);
    const candidateUsers = [...followingIds, me];

    const stories = await Story.find({
      user: { $in: candidateUsers },
      isActive: true,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    })
      .populate("user", `${USER_FIELDS} closeFriends`)
      .sort({ createdAt: -1 })
      .lean();

    const visible = stories.filter((s) => {
      const ownerId = s.user._id.toString();
      if (ownerId === meStr) return true;
      if (s.privacy === "public") return true;
      if (s.privacy === "followers") return true; // candidateUsers are people I follow
      if (s.privacy === "close_friends") {
        return (s.user.closeFriends || []).some(
          (cf) => cf.toString() === meStr,
        );
      }
      return false;
    });

    const ids = visible.map((s) => s._id);
    const seen = ids.length
      ? await StoryView.find({ story: { $in: ids }, viewer: me })
          .select("story")
          .lean()
      : [];
    const seenSet = new Set(seen.map((v) => v.story.toString()));

    // Group by user; groups ordered by most-recent story, stories asc for playback.
    const groups = [];
    const index = {};
    for (const s of visible) {
      const uid = s.user._id.toString();
      if (!index[uid]) {
        index[uid] = {
          user: {
            _id: s.user._id,
            username: s.user.username,
            fullName: s.user.fullName,
            profilePicture: s.user.profilePicture,
            isVerified: s.user.isVerified,
          },
          stories: [],
        };
        groups.push(index[uid]);
      }
      index[uid].stories.push({
        _id: s._id,
        media: s.media,
        privacy: s.privacy,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        seen: seenSet.has(s._id.toString()),
        isOwn: uid === meStr,
      });
    }
    for (const g of groups) {
      g.stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    res.status(200).json({ success: true, groups });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// A single user's active stories (privacy-aware for the requester)
// ---------------------------------------------------------------------------
export const getUserStories = async (req, res) => {
  try {
    const me = req.user._id;
    const meStr = me.toString();

    const owner = await User.findOne({ username: req.params.username }).select(
      "closeFriends",
    );
    if (!owner) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const ownerId = owner._id.toString();
    const isOwn = ownerId === meStr;

    let followsOwner = isOwn;
    if (!isOwn) {
      followsOwner = !!(await Follow.findOne({
        follower: me,
        following: owner._id,
      }));
    }
    const isCloseFriend =
      isOwn || (owner.closeFriends || []).some((cf) => cf.toString() === meStr);

    const stories = await Story.find({
      user: owner._id,
      isActive: true,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .lean();

    const visible = stories.filter((s) => {
      if (s.privacy === "public") return true;
      if (s.privacy === "followers") return followsOwner;
      if (s.privacy === "close_friends") return isCloseFriend;
      return false;
    });

    const ids = visible.map((s) => s._id);
    const seen = ids.length
      ? await StoryView.find({ story: { $in: ids }, viewer: me })
          .select("story")
          .lean()
      : [];
    const seenSet = new Set(seen.map((v) => v.story.toString()));

    res.status(200).json({
      success: true,
      stories: visible.map((s) => ({
        _id: s._id,
        media: s.media,
        privacy: s.privacy,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        seen: seenSet.has(s._id.toString()),
        isOwn,
      })),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// RECORD VIEW — deduped (unique index) so a user counts once.
// Optionally marks completion; increments counters only on real transitions.
// ---------------------------------------------------------------------------
export const recordView = async (req, res) => {
  try {
    const { id } = req.params;
    const { completed = false, lastItemIndex = 0 } = req.body;
    const viewerId = req.user._id;

    const story = await Story.findOne({ _id: id, isDeleted: false });
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    const ownerId = story.user.toString();
    // Don't count the owner's own views.
    if (ownerId === viewerId.toString()) {
      return res.status(200).json({ success: true, own: true });
    }

    const now = new Date();
    const raw = await StoryView.findOneAndUpdate(
      { story: id, viewer: viewerId },
      { $set: { lastViewedAt: now }, $setOnInsert: { viewedAt: now } },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        includeResultMetadata: true,
      },
    );
    const isNewView = raw?.lastErrorObject?.updatedExisting === false;

    let newCompletion = false;
    if (completed) {
      const marked = await StoryView.findOneAndUpdate(
        { story: id, viewer: viewerId, completed: { $ne: true } },
        { $set: { completed: true, lastItemIndex } },
        { new: true },
      );
      newCompletion = !!marked;
    }

    const inc = {};
    if (isNewView) inc.viewsCount = 1;
    if (newCompletion) inc.completedCount = 1;
    if (Object.keys(inc).length) {
      await Story.findByIdAndUpdate(id, { $inc: inc });
    }

    const viewer = await User.findById(viewerId).select(USER_FIELDS).lean();

    if (isNewView) {
      await emitAnalytics(ownerId, id, "view", viewer);
    }
    if (newCompletion) {
      await emitAnalytics(ownerId, id, "completed", viewer);
    }

    res.status(200).json({
      success: true,
      counted: isNewView,
      completed: newCompletion,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// REACT (emoji) — deduped per (story, user, emoji)
// ---------------------------------------------------------------------------
export const reactToStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ success: false, message: "Emoji required" });
    }
    const story = await Story.findOne({ _id: id, isDeleted: false });
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    let created = false;
    try {
      await StoryReaction.create({ story: id, user: req.user._id, emoji });
      await Story.findByIdAndUpdate(id, { $inc: { reactionsCount: 1 } });
      created = true;
    } catch (err) {
      if (err.code !== 11000) throw err; // 11000 = duplicate reaction, ignore
    }

    if (created) {
      const actor = await User.findById(req.user._id).select(USER_FIELDS).lean();
      await emitAnalytics(story.user, id, "reaction", actor, { emoji });
    }

    res.status(200).json({ success: true, created });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// REPLY (text)
// ---------------------------------------------------------------------------
export const replyToStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Text required" });
    }
    const story = await Story.findOne({ _id: id, isDeleted: false });
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    const reply = await StoryReply.create({
      story: id,
      user: req.user._id,
      text: text.trim(),
    });
    await Story.findByIdAndUpdate(id, { $inc: { repliesCount: 1 } });

    const actor = await User.findById(req.user._id).select(USER_FIELDS).lean();
    await emitAnalytics(story.user, id, "reply", actor, { text: reply.text });

    res.status(201).json({ success: true, reply });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// DELETE own story (before expiry) — soft delete, hidden from feed
// ---------------------------------------------------------------------------
export const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findOne({ _id: id });
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your story" });
    }

    story.isDeleted = true;
    story.isActive = false;
    await story.save();

    res.status(200).json({ success: true, message: "Story deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// ANALYTICS (owner-only). Works for archived stories too — analytics retained.
// Summary counts come from denormalized fields (O(1)); viewer list is paginated;
// timeline is an hour-bucketed aggregation over the indexed StoryView collection.
// ---------------------------------------------------------------------------
export const getStoryAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const skip = (page - 1) * limit;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view analytics for your own story",
      });
    }

    const viewsCount = story.viewsCount; // == unique viewers (deduped)
    const completedCount = story.completedCount;
    const completionRate = viewsCount
      ? Math.round((completedCount / viewsCount) * 100)
      : 0;

    const viewers = await StoryView.find({ story: id })
      .populate("viewer", USER_FIELDS)
      .sort({ viewedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const reactions = await StoryReaction.aggregate([
      { $match: { story: story._id } },
      { $group: { _id: "$emoji", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const replies = await StoryReply.find({ story: id })
      .populate("user", USER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // View timeline: views bucketed per hour.
    const timeline = await StoryView.aggregate([
      { $match: { story: story._id } },
      {
        $group: {
          _id: {
            $dateTrunc: { date: "$viewedAt", unit: "hour", binSize: 1 },
          },
          views: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        storyId: id,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        isArchived: story.isArchived,
        isActive: story.isActive,
        viewsCount,
        uniqueViewers: viewsCount,
        completedCount,
        completionRate,
        reactionsCount: story.reactionsCount,
        reactions,
        repliesCount: story.repliesCount,
        replies,
        viewers,
        page,
        limit,
        hasMore: skip + viewers.length < viewsCount,
        timeline: timeline.map((t) => ({ hour: t._id, views: t.views })),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// ARCHIVE (owner-only): all your non-deleted stories — active AND expired —
// used to pick stories when creating a highlight.
// ---------------------------------------------------------------------------
export const getArchive = async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.user._id,
      isDeleted: false,
    })
      .select("media privacy createdAt expiresAt isActive isArchived highlight")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, stories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
