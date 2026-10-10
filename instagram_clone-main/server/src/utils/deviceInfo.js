import { UAParser } from "ua-parser-js";

// Parse a User-Agent string into the fields we log for Login History and use
// for the browser/device login rules. `deviceHint` is the client-reported
// Laptop/Desktop signal (see client/lib/deviceHint.ts) — a UA alone cannot
// separate the two.
export function parseDeviceInfo(userAgent = "", deviceHint = "") {
  const result = new UAParser(userAgent || "").getResult();

  const browserRaw = result.browser?.name || "Unknown";
  const browser = normalizeBrowser(browserRaw);
  const os = result.os?.name
    ? `${result.os.name}${result.os.version ? " " + result.os.version : ""}`
    : "Unknown";
  const deviceType = normalizeDeviceType(result.device?.type, deviceHint);

  return { browser, browserRaw, os, deviceType };
}

// ua-parser reports "Mobile Chrome" / "Mobile Safari" on phones — collapse to
// the base brand so rule checks are simple. Edge is reported separately from
// Chrome by ua-parser, so we do NOT need extra "Edg" string sniffing.
function normalizeBrowser(name) {
  return String(name).replace(/^Mobile\s+/i, "").trim() || "Unknown";
}

// ua-parser leaves device.type undefined for desktop machines. Mobile and
// Tablet always come from the UA (a client header must not be able to escape
// the mobile login-window rule); the hint only splits Laptop vs Desktop.
function normalizeDeviceType(type, deviceHint = "") {
  if (type === "mobile") return "Mobile";
  if (type === "tablet") return "Tablet";
  if (type === "console" || type === "smarttv" || type === "wearable" || type === "embedded")
    return "Unknown";
  return String(deviceHint).toLowerCase() === "laptop" ? "Laptop" : "Desktop";
}

export const isChromeBrowser = (browser) => /^chrome$/i.test(browser || "");
// Edge reports as "Edge", "Microsoft Edge" or (Chromium Edge) "Edg" — accept any
// Microsoft-branded browser name.
export const isEdgeBrowser = (browser) =>
  /(edge|edg|internet explorer|microsoft)/i.test(String(browser || "").trim());
export const isMobileDevice = (deviceType) => deviceType === "Mobile";

// Best-effort client IP (works behind proxies like Vercel/NGINX too).
export function getClientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}
