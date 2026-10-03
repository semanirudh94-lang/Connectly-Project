import User from "../models/User.model.js";

const USER_FIELDS = "username fullName profilePicture isVerified";

// ---------------------------------------------------------------------------
// LIST my close friends
// ---------------------------------------------------------------------------
export const getCloseFriends = async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .select("closeFriends")
      .populate("closeFriends", USER_FIELDS)
      .lean();
    res
      .status(200)
      .json({ success: true, closeFriends: me?.closeFriends || [] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// ADD a close friend (idempotent via $addToSet)
// ---------------------------------------------------------------------------
export const addCloseFriend = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot add yourself" });
    }
    const target = await User.findById(userId).select("_id");
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { closeFriends: userId },
    });

    res.status(200).json({ success: true, message: "Added to close friends" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// REMOVE a close friend
// ---------------------------------------------------------------------------
export const removeCloseFriend = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { closeFriends: userId },
    });
    res.status(200).json({ success: true, message: "Removed from close friends" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
