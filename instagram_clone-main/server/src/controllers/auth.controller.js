import User from "../models/User.model.js";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import Post from "../models/Post.model.js";
import Like from "../models/Like.model.js";
export const register = async (req, res) => {
  try {
    const { username, fullName, email, password, profilePicture } = req.body;
    if (!username || !fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "ALL fields are required",
      });
    }
    const exisitngUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (exisitngUser) {
      return res.status(400).json({
        success: false,
        message: "User already exisits",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      fullName,
      email,
      password: hashedPassword,
      profilePicture,
    });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    res.status(201).json({
      success: true,
      message: "User Created Successfully",
      accessToken,
      user: user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "ALL fields are required",
      });
    }
    const user = await User.findOne({
      email,
    }).select("+password +refreshToken");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password.",
      });
    }

    res.status(201).json({
      success: true,
      message: "User Created Successfully",
      user: user,
      accessToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const me = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const posts = await Post.find({
      user: user._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    const postIds = posts.map((post) => post._id);

    const likes = await Like.find({
      post: { $in: postIds },
    }).populate("user", "username fullName profilePicture");

    const likesMap = {};

    likes.forEach((like) => {
      const postId = like.post.toString();

      if (!likesMap[postId]) {
        likesMap[postId] = [];
      }

      likesMap[postId].push(like);
    });

    const postsWithLikes = posts.map((post) => ({
      ...post,
      likes: likesMap[post._id.toString()] || [],
    }));

    res.status(200).json({
      success: true,
      user,
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
