import { UAParser } from "ua-parser-js";

// Parse a User-Agent string into the fields we log for Login History and use
// for the browser/device login rules.
export function parseDeviceInfo(userAgent = "") {
  const result = new UAParser(userAgent || "").getResult();

  const browserRaw = result.browser?.name || "Unknown";
  const browser = normalizeBrowser(browserRaw);
  const os = result.os?.name
    ? `${result.os.name}${result.os.version ? " " + result.os.version : ""}`
    : "Unknown";
  const deviceType = normalizeDeviceType(result.device?.type);

  return { browser, browserRaw, os, deviceType };
}

// ua-parser reports "Mobile Chrome" / "Mobile Safari" on phones — collapse to
// the base brand so rule checks are simple. Edge is reported separately from
// Chrome by ua-parser, so we do NOT need extra "Edg" string sniffing.
function normalizeBrowser(name) {
  return String(name).replace(/^Mobile\s+/i, "").trim() || "Unknown";
}

// ua-parser leaves device.type undefined for desktops. Note: a User-Agent
// cannot distinguish a Laptop from a Desktop, so both map to "Desktop".
function normalizeDeviceType(type) {
  if (type === "mobile") return "Mobile";
  if (type === "tablet") return "Tablet";
  return "Desktop";
}

export const isChromeBrowser = (browser) => /^chrome$/i.test(browser || "");
export const isEdgeBrowser = (browser) => /^edge$/i.test(browser || "");
export const isMobileDevice = (deviceType) => deviceType === "Mobile";

// Best-effort client IP (works behind proxies like Vercel/NGINX too).
export function getClientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}
