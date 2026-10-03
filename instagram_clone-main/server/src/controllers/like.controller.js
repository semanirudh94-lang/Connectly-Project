import Like from "../models/Like.model.js";
import Post from "../models/Post.model.js";

export const LikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const alreadyLiked = await Like.findOne({
      user: req.user._id,
      post: postId,
    });
    if (alreadyLiked) {
      return res.status(400).json({
        success: false,
        message: "Post Already Liked",
      });
    }
    await Like.create({
      user: req.user._id,
      post: postId,
    });
    await Post.findByIdAndUpdate(postId, {
      $inc: { likesCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Post Liked Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const UnLikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const Liked = await Like.findOneAndDelete({
      user: req.user._id,
      post: postId,
    });
    if (!Liked) {
      return res.status(400).json({
        success: false,
        message: "Liked not found",
      });
    }

    await Post.findByIdAndUpdate(postId, {
      $inc: { likesCount: -1 },
    });

    res.status(201).json({
      success: true,
      message: "Post Unliked Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
