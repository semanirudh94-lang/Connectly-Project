import User from "../models/User.model.js";
import Post from "../models/Post.model.js";
import Like from "../models/Like.model.js";
export const createPost = async (req, res) => {
  try {
    const { caption, location, media, taggedUsers, visibility } = req.body;
    if (!media || media.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at lease one image",
      });
    }

    const post = await Post.create({
      user: req.user._id,
      caption,
      location,
      media,
      taggedUsers,
      visibility,
    });
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { PostCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Post Created Successfully",
      post,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ isDeleted: false })
      .populate("user", "username fullName profilePicture")
      .lean();

    const postsWithLikes = await Promise.all(
      posts.map(async (post) => {
        const likes = await Like.find({ post: post._id }).populate(
          "user",
          "username fullName profilePicture",
        );

        return {
          ...post,
          likes,
        };
      }),
    );

    res.status(200).json({
      success: true,
      posts: postsWithLikes,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }
    const posts = await Post.find({ user: user?._id, isDeleted: false }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
