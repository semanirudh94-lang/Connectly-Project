import mongoose from "mongoose";
import Report from "../models/Report.model.js";
import Post from "../models/Post.model.js";
import Story from "../models/Story.model.js";
import Comment from "../models/Comment.model.js";
import User from "../models/User.model.js";

const TARGET_MODELS = {
  post: Post,
  story: Story,
  comment: Comment,
  user: User,
};

const REASONS = ["spam", "nudity", "violence", "hate", "harassment", "other"];

// POST /api/reports  body: { targetType, targetId, reason?, description? }
// Any signed-in user may flag content; admins triage the queue from the
// dashboard. The target must actually exist so the queue stays meaningful.
export const createReport = async (req, res) => {
  try {
    const {
      targetType,
      targetId,
      reason = "other",
      description = "",
    } = req.body;

    const Model = TARGET_MODELS[targetType];
    if (!Model) {
      return res.status(400).json({
        success: false,
        code: "report_target_invalid",
        message: "Nothing to report here",
      });
    }
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({
        success: false,
        code: "report_target_invalid",
        message: "Nothing to report here",
      });
    }
    if (!REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        code: "report_reason_invalid",
        message: "Pick a valid report reason",
      });
    }

    const target = await Model.findById(targetId).select("_id");
    if (!target) {
      return res.status(404).json({
        success: false,
        code: "report_target_not_found",
        message: "The content you are trying to report no longer exists",
      });
    }

    const already = await Report.findOne({
      reporter: req.user._id,
      targetId,
      status: "pending",
    });
    if (already) {
      return res.status(409).json({
        success: false,
        code: "report_already_exists",
        message: "You already reported this. Our team is reviewing it.",
      });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      description: String(description).slice(0, 1000),
    });

    res.status(201).json({
      success: true,
      code: "report_submitted",
      message: "Thanks — our team will review this.",
      report,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
