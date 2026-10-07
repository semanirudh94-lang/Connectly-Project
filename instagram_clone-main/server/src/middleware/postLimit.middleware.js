import { checkPostLimit } from "../services/plan.service.js";

// Guards post creation: rejects the request when the user has already reached
// their active plan's posting limit for the current billing period.
export const enforcePostLimit = async (req, res, next) => {
  try {
    const result = await checkPostLimit(req.user);
    if (!result.allowed) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
        plan: result.usage.activePlan,
        limit: result.usage.limit,
        used: result.usage.used,
      });
    }
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
