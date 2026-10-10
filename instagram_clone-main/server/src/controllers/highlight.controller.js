import Highlight from "../models/Highlight.model.js";
import Story from "../models/Story.model.js";
import Follow from "../models/Follow.model.js";
import User from "../models/User.model.js";

// ---------------------------------------------------------------------------
// CREATE HIGHLIGHT — pick from your own stories (active or archived).
// Archived stories are allowed so highlights outlive the 24h expiry.
// ---------------------------------------------------------------------------
export const createHighlight = async (req, res) => {
  try {
    const { name, cover, storyIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        code: "highlight_name_required",
        message: "Highlight name required",
      });
    }
    const ids = Array.isArray(storyIds) ? storyIds : storyIds ? [storyIds] : [];

    // Only your own, non-deleted stories can be added.
    const owned = await Story.find({
      _id: { $in: ids },
      user: req.user._id,
      isDeleted: false,
    }).select("_id media privacy");

    if (!owned.length) {
      return res.status(400).json({
        success: false,
        code: "highlight_no_valid_stories",
        message: "No valid stories to add",
      });
    }

    const ownedIds = owned.map((s) => s._id);
    const resolvedCover =
      cover || owned[0]?.media?.url || "";

    const highlight = await Highlight.create({
      user: req.user._id,
      name: name.trim(),
      cover: resolvedCover,
      stories: ownedIds,
    });

    // Back-reference on stories so we know they live in a highlight.
    await Story.updateMany(
      { _id: { $in: ownedIds } },
      { $set: { highlight: highlight._id } },
    );

    res.status(201).json({ success: true, highlight });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// LIST HIGHLIGHTS for a profile (username). Privacy-aware: close_friends
// stories inside a highlight are hidden from non-close-friends.
// ---------------------------------------------------------------------------
export const getHighlights = async (req, res) => {
  try {
    const me = req.user._id;
    const meStr = me.toString();

    const owner = await User.findOne({ username: req.params.username }).select(
      "closeFriends",
    );
    if (!owner) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isOwn = owner._id.toString() === meStr;
    let followsOwner = isOwn;
    if (!isOwn) {
      followsOwner = !!(await Follow.findOne({
        follower: me,
        following: owner._id,
      }));
    }
    const isCloseFriend =
      isOwn || (owner.closeFriends || []).some((cf) => cf.toString() === meStr);

    const highlights = await Highlight.find({ user: owner._id })
      .populate({
        path: "stories",
        match: { isDeleted: false },
        select: "media privacy createdAt",
      })
      .sort({ createdAt: -1 })
      .lean();

    const result = highlights
      .map((h) => {
        const visibleStories = (h.stories || []).filter((s) => {
          if (s.privacy === "public") return true;
          if (s.privacy === "followers") return followsOwner;
          if (s.privacy === "close_friends") return isCloseFriend;
          return false;
        });
        return { ...h, stories: visibleStories };
      })
      .filter((h) => h.stories.length > 0);

    res.status(200).json({ success: true, highlights: result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// HIGHLIGHT DETAIL — full media list for playback (privacy-aware).
// ---------------------------------------------------------------------------
export const getHighlightDetail = async (req, res) => {
  try {
    const me = req.user._id;
    const meStr = me.toString();

    const highlight = await Highlight.findById(req.params.id)
      .populate({
        path: "stories",
        match: { isDeleted: false },
        select: "media privacy createdAt user",
      })
      .populate("user", "username fullName profilePicture isVerified closeFriends")
      .lean();

    if (!highlight) {
      return res
        .status(404)
        .json({ success: false, message: "Highlight not found" });
    }

    const ownerId = highlight.user._id.toString();
    const isOwn = ownerId === meStr;
    let followsOwner = isOwn;
    if (!isOwn) {
      followsOwner = !!(await Follow.findOne({
        follower: me,
        following: highlight.user._id,
      }));
    }
    const isCloseFriend =
      isOwn ||
      (highlight.user.closeFriends || []).some((cf) => cf.toString() === meStr);

    const stories = (highlight.stories || []).filter((s) => {
      if (s.privacy === "public") return true;
      if (s.privacy === "followers") return followsOwner;
      if (s.privacy === "close_friends") return isCloseFriend;
      return false;
    });

    res.status(200).json({
      success: true,
      highlight: {
        _id: highlight._id,
        name: highlight.name,
        cover: highlight.cover,
        user: {
          _id: highlight.user._id,
          username: highlight.user.username,
          fullName: highlight.user.fullName,
          profilePicture: highlight.user.profilePicture,
          isVerified: highlight.user.isVerified,
        },
        stories,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// ADD stories to an existing highlight (owner-only)
// ---------------------------------------------------------------------------
export const addToHighlight = async (req, res) => {
  try {
    const { storyIds } = req.body;
    const ids = Array.isArray(storyIds) ? storyIds : storyIds ? [storyIds] : [];

    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res
        .status(404)
        .json({ success: false, message: "Highlight not found" });
    }
    if (highlight.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not your highlight" });
    }

    const owned = await Story.find({
      _id: { $in: ids },
      user: req.user._id,
      isDeleted: false,
    }).select("_id");
    const ownedIds = owned.map((s) => s._id);

    const toAdd = ownedIds.filter(
      (id) => !highlight.stories.some((h) => h.toString() === id.toString()),
    );
    if (toAdd.length) {
      highlight.stories.push(...toAdd);
      await highlight.save();
      await Story.updateMany(
        { _id: { $in: toAdd } },
        { $set: { highlight: highlight._id } },
      );
    }

    res.status(200).json({ success: true, highlight });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// REMOVE a story from a highlight (owner-only)
// ---------------------------------------------------------------------------
export const removeFromHighlight = async (req, res) => {
  try {
    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res
        .status(404)
        .json({ success: false, message: "Highlight not found" });
    }
    if (highlight.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not your highlight" });
    }

    highlight.stories = highlight.stories.filter(
      (s) => s.toString() !== req.params.storyId.toString(),
    );
    await highlight.save();
    await Story.findByIdAndUpdate(req.params.storyId, {
      $set: { highlight: null },
    });

    res.status(200).json({ success: true, highlight });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// UPDATE highlight name/cover (owner-only)
// ---------------------------------------------------------------------------
export const updateHighlight = async (req, res) => {
  try {
    const { name, cover } = req.body;
    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res
        .status(404)
        .json({ success: false, message: "Highlight not found" });
    }
    if (highlight.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not your highlight" });
    }

    if (name !== undefined) highlight.name = name.trim();
    if (cover !== undefined) highlight.cover = cover;
    await highlight.save();

    res.status(200).json({ success: true, highlight });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// DELETE highlight (owner-only) — clears back-reference on its stories.
// ---------------------------------------------------------------------------
export const deleteHighlight = async (req, res) => {
  try {
    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res
        .status(404)
        .json({ success: false, message: "Highlight not found" });
    }
    if (highlight.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not your highlight" });
    }

    await Story.updateMany(
      { _id: { $in: highlight.stories } },
      { $set: { highlight: null } },
    );
    await highlight.deleteOne();

    res.status(200).json({ success: true, message: "Highlight deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
