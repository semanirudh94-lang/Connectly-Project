import Follow from "../models/Follow.model.js";
import User from "../models/User.model.js";

// Follow User
export const followUser = async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user._id;

    if (followingId === followerId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    const alreadyFollowing = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (alreadyFollowing) {
      return res.status(400).json({
        success: false,
        message: "Already following this user.",
      });
    }

    await Follow.create({
      follower: followerId,
      following: followingId,
    });

    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: 1 },
    });

    await User.findByIdAndUpdate(followingId, {
      $inc: { followersCount: 1 },
    });

    res.status(200).json({
      success: true,
      message: "User followed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Unfollow User
export const unfollowUser = async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user._id;

    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId,
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: "Follow relationship not found.",
      });
    }

    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: -1 },
    });

    await User.findByIdAndUpdate(followingId, {
      $inc: { followersCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: "User unfollowed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getFollowingUsers = async (req, res) => {
  try {
    const follow = await Follow.find({
      follower: req.user._id,
    }).populate(
      "following",
      "username fullName profilePicture isVerified"
    );

    res.status(200).json({
      success: true,
      message: "Following users fetched successfully.",
      users: follow.map((item) => item.following),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
