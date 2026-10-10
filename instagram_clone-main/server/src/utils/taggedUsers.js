import mongoose from "mongoose";
import User from "../models/User.model.js";

const MAX_TAGGED_USERS = 20;

// Keeps only ids that are valid ObjectIds of real users, so a crafted request
// cannot store arbitrary strings or tag accounts that do not exist.
export async function sanitizeTaggedUsers(ids) {
  const candidates = (Array.isArray(ids) ? ids : [])
    .map((id) => String(id))
    .filter((id) => mongoose.isValidObjectId(id));

  if (candidates.length === 0) return [];

  const users = await User.find({
    _id: { $in: candidates },
  }).select("_id");

  const existing = new Set(users.map((u) => String(u._id)));
  return [...new Set(candidates.filter((id) => existing.has(id)))].slice(
    0,
    MAX_TAGGED_USERS,
  );
}
