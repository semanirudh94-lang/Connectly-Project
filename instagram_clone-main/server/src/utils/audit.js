import AuditLog from "../models/AuditLog.model.js";
import { getClientIp } from "./deviceInfo.js";

// Best-effort audit writer. Never throws into the request path — a failed audit
// insert must not break the admin action it is recording.
export async function writeAudit(req, { action, entityType, entityId = null, summary = "", changes = null }) {
  try {
    await AuditLog.create({
      admin: req.user?._id,
      action,
      entityType,
      entityId,
      summary,
      changes,
      ip: getClientIp(req),
      userAgent: req.headers?.["user-agent"] || "",
    });
  } catch (error) {
    console.log("[audit] failed to write log:", error.message);
  }
}
