// Runs AFTER protect (so req.user is set). Only administrators may proceed.
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator access required",
    });
  }
  next();
};
