import User from "../models/User.model.js";
import Post from "../models/Post.model.js";
import Like from "../models/Like.model.js";
import { resolveHashtags } from "../utils/hashtags.js";
import { sanitizeTaggedUsers } from "../utils/taggedUsers.js";

// Attaches each post's likers with a single query for the whole page, rather
// than one per post.
async function attachLikes(posts) {
  const likes = await Like.find({ post: { $in: posts.map((p) => p._id) } })
    .populate("user", "username fullName profilePicture")
    .lean();

  const byPost = new Map();
  for (const like of likes) {
    const key = String(like.post);
    if (!byPost.has(key)) byPost.set(key, []);
    byPost.get(key).push(like);
  }

  return posts.map((post) => ({
    ...post,
    likes: byPost.get(String(post._id)) || [],
  }));
}

export const createPost = async (req, res) => {
  try {
    const { caption, location, media, taggedUsers, visibility } = req.body;
    if (!media || media.length === 0) {
      return res.status(400).json({
        success: false,
        code: "media_required",
        message: "Please upload at least one image",
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
    const posts = await Post.find({ isDeleted: false, status: "published" })
      .populate("user", "username fullName profilePicture")
      .populate("taggedUsers", "username fullName profilePicture")
      .lean();

    const postsWithLikes = await attachLikes(posts);

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
    const posts = await Post.find({
      user: user?._id,
      isDeleted: false,
      status: "published",
    })
      .populate("taggedUsers", "username fullName profilePicture")
      .sort({
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
