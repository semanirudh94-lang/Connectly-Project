import Comment from "../models/Comment.model.js";
import Post from "../models/Post.model.js";

// POST /api/comments/:postId  body: { text }
export const createComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Comment text is required" });
    }

    const post = await Post.findById(req.params.postId);
    if (!post || post.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const comment = await Comment.create({
      post: post._id,
      user: req.user._id,
      text: text.trim(),
    });

    await Post.findByIdAndUpdate(post._id, { $inc: { commentsCount: 1 } });

    const populated = await comment.populate(
      "user",
      "username fullName profilePicture isVerified",
    );

    res.status(201).json({ success: true, comment: populated });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

// GET /api/comments/:postId
export const getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      post: req.params.postId,
      isDeleted: false,
    })
      .populate("user", "username fullName profilePicture isVerified")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, comments });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

// DELETE /api/comments/:id  — author or post owner may delete
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    const post = await Post.findById(comment.post);
    const isAuthor = comment.user.toString() === req.user._id.toString();
    const isPostOwner =
      post && post.user.toString() === req.user._id.toString();

    if (!isAuthor && !isPostOwner) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to delete this comment",
      });
    }

    comment.isDeleted = true;
    await comment.save();
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -1 },
    });

    res
      .status(200)
      .json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};
