import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import Post from "../models/Post.model.js";
import Like from "../models/Like.model.js";
import LoginHistory from "../models/LoginHistory.model.js";
import LoginSession from "../models/LoginSession.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import {
  parseDeviceInfo,
  getClientIp,
  isChromeBrowser,
  isEdgeBrowser,
  isMobileDevice,
} from "../utils/deviceInfo.js";
import {
  isWithinLoginWindow,
  LOGIN_WINDOW_CLOSED_MESSAGE,
} from "../utils/loginWindow.js";
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  otpExpiryDate,
  lockUntilDate,
  maskEmail,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
} from "../utils/otp.js";
import { sendOtpEmail } from "../services/mailer.js";

const otpMinutes = Math.round(OTP_TTL_MS / 60000);
const resendSeconds = Math.round(RESEND_COOLDOWN_MS / 1000);

// Strip secret fields before a user document is ever sent to the client.
const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

// Best-effort audit write — never let logging break the login response.
async function logAttempt(user, info, ip, status, failureReason = "") {
  try {
    return await LoginHistory.create({
      user: user._id ?? user,
      browser: info.browser,
      os: info.os,
      deviceType: info.deviceType,
      ip,
      status,
      failureReason,
      loginAt: new Date(),
    });
  } catch (err) {
    console.log("[loginHistory] log failed:", err.message);
    return null;
  }
}

// Records a failed attempt that could not be tied to an existing account.
async function logUnknownAttempt(email, info, ip, failureReason = "") {
  try {
    return await LoginHistory.create({
      emailAttempted: email || "",
      browser: info.browser,
      os: info.os,
      deviceType: info.deviceType,
      ip,
      status: "failed",
      failureReason,
      loginAt: new Date(),
    });
  } catch (err) {
    console.log("[loginHistory] unknown-attempt log failed:", err.message);
    return null;
  }
}

// Issue tokens, persist the refresh token, record a successful login.
async function completeLogin(res, user, info, ip) {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();
  await logAttempt(user, info, ip, "success");
  return res.status(200).json({
    success: true,
    code: "login_success",
    message: "Login successful",
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  });
}

export const register = async (req, res) => {
  try {
    const { username, fullName, email, password, profilePicture, phone } =
      req.body;
    if (!username || !fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        code: "missing_fields",
        message: "ALL fields are required",
      });
    }
    const exisitngUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (exisitngUser) {
      return res.status(400).json({
        success: false,
        code: "user_exists",
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
      phone: phone || "",
    });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    res.status(201).json({
      success: true,
      code: "registered",
      message: "User Created Successfully",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/auth/login
// Rules applied after credentials pass:
//   1. Mobile device  → only allowed inside the server-time login window.
//   2. Chrome browser → email OTP required (2-step); no token yet.
//   3. Microsoft browser (Edge/IE) → direct login, no verification.
//   4. Any other browser → direct login.
export const login = async (req, res) => {
  const info = parseDeviceInfo(
    req.headers["user-agent"] || "",
    req.headers["x-device-hint"],
  );
  const ip = getClientIp(req);

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: "missing_fields",
        message: "ALL fields are required",
      });
    }

    const user = await User.findOne({ email }).select("+password +refreshToken");
    if (!user) {
      // No user to attribute an audit record to, but still record the failed
      // attempt (with the tried email) for auditing. Do not leak which field failed.
      await logUnknownAttempt(email, info, ip, "No such account");
      return res.status(400).json({
        success: false,
        code: "invalid_credentials",
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAttempt(user, info, ip, "failed", "Invalid password");
      return res.status(400).json({
        success: false,
        code: "invalid_password",
        message: "Invalid password.",
      });
    }

    // Rule 1 — mobile login window (server time).
    if (isMobileDevice(info.deviceType) && !isWithinLoginWindow()) {
      await logAttempt(
        user,
        info,
        ip,
        "denied_window",
        "Mobile login outside allowed window",
      );
      return res.status(403).json({
        success: false,
        code: "login_window_closed",
        message: LOGIN_WINDOW_CLOSED_MESSAGE,
        deniedWindow: true,
      });
    }

    // Rule 2 — Chrome requires email OTP before issuing any token.
    if (isChromeBrowser(info.browser)) {
      const otp = generateOtp();
      const challengeToken = crypto.randomBytes(32).toString("hex");

      // Retire any stale pending challenge for this user.
      await LoginSession.deleteMany({ user: user._id });
      await LoginHistory.updateMany(
        { user: user._id, status: "pending" },
        { $set: { status: "expired", failureReason: "Superseded by a new login" } },
      );

      const history = await logAttempt(user, info, ip, "pending");
      await LoginSession.create({
        user: user._id,
        challengeTokenHash: hashOtp(challengeToken),
        otpHash: hashOtp(otp),
        target: maskEmail(user.email),
        browser: info.browser,
        os: info.os,
        deviceType: info.deviceType,
        ip,
        historyId: history?._id || null,
        expiresAt: otpExpiryDate(),
      });

      await sendOtpEmail({ to: user.email, otp, minutes: otpMinutes });

      return res.status(200).json({
        success: true,
        requiresOtp: true,
        code: "otp_required",
        challengeToken,
        target: maskEmail(user.email),
        expiresIn: otpMinutes * 60,
        resendAfter: resendSeconds,
        message: "We sent a verification code to your email.",
      });
    }

    // Rule 3 — Microsoft browsers (Edge / IE) log in with no extra verification.
    if (isEdgeBrowser(info.browser)) {
      return await completeLogin(res, user, info, ip);
    }

    // Rule 4 — every other browser also logs in directly.
    return await completeLogin(res, user, info, ip);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/auth/login/verify  body: { challengeToken, otp }
export const verifyLoginOtp = async (req, res) => {
  const { challengeToken, otp } = req.body;
  try {
    if (!challengeToken || !otp) {
      return res.status(400).json({
        success: false,
        code: "otp_missing_fields",
        message: "Missing challenge token or code.",
      });
    }

    const session = await LoginSession.findOne({
      challengeTokenHash: hashOtp(challengeToken),
    });
    if (!session || session.verified) {
      return res.status(400).json({
        success: false,
        code: "login_session_expired",
        message: "Session expired. Please log in again.",
      });
    }
    if (session.lockedUntil && session.lockedUntil > new Date()) {
      const wait = Math.ceil((session.lockedUntil - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        code: "otp_locked",
        message: `Too many failed attempts. Locked for ${wait}s.`,
        retryAfter: wait,
        locked: true,
      });
    }
    if (session.expiresAt < new Date()) {
      if (session.historyId) {
        await LoginHistory.findByIdAndUpdate(session.historyId, {
          status: "expired",
          failureReason: "OTP challenge expired",
        });
      }
      await session.deleteOne();
      return res.status(400).json({
        success: false,
        code: "otp_expired",
        message: "Code expired. Please log in again.",
      });
    }

    const info = {
      browser: session.browser,
      os: session.os,
      deviceType: session.deviceType,
    };

    session.attempts += 1;
    if (!verifyOtpHash(otp, session.otpHash)) {
      await logAttempt(session.user, info, session.ip, "otp_failed", "Wrong OTP");
      if (session.attempts >= session.maxAttempts) {
        session.lockedUntil = lockUntilDate();
        await session.save();
        return res.status(429).json({
          success: false,
          code: "otp_max_attempts",
          message: "Too many wrong attempts. Locked for 15 minutes.",
          locked: true,
        });
      }
      await session.save();
      return res.status(400).json({
        success: false,
        code: "otp_wrong_code",
        message: `Wrong code. ${session.maxAttempts - session.attempts} attempt(s) left.`,
        attemptsLeft: session.maxAttempts - session.attempts,
      });
    }

    // Correct code — issue tokens and finalise the audit record.
    session.verified = true;
    await session.save();

    const user = await User.findById(session.user).select("+refreshToken");
    if (!user) {
      return res.status(400).json({ success: false, code: "user_not_found", message: "User not found." });
    }

    if (session.historyId) {
      await LoginHistory.findByIdAndUpdate(session.historyId, {
        status: "success",
        failureReason: "",
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    await session.deleteOne();

    return res.status(200).json({
      success: true,
      code: "login_success",
      message: "Login successful",
      user: sanitizeUser(user),
      accessToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login/resend  body: { challengeToken }
export const resendLoginOtp = async (req, res) => {
  const { challengeToken } = req.body;
  try {
    const session = await LoginSession.findOne({
      challengeTokenHash: hashOtp(challengeToken || ""),
    });
    if (!session || session.verified) {
      return res.status(400).json({
        success: false,
        code: "login_session_expired",
        message: "Session expired. Please log in again.",
      });
    }
    if (session.lockedUntil && session.lockedUntil > new Date()) {
      const wait = Math.ceil((session.lockedUntil - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        code: "otp_locked",
        message: `Locked. Try again in ${wait}s.`,
        retryAfter: wait,
        locked: true,
      });
    }
    const since = Date.now() - new Date(session.lastSentAt).getTime();
    if (since < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - since) / 1000);
      return res.status(429).json({
        success: false,
        code: "otp_cooldown",
        message: `Please wait ${wait}s before resending.`,
        retryAfter: wait,
      });
    }

    const otp = generateOtp();
    session.otpHash = hashOtp(otp);
    session.expiresAt = otpExpiryDate();
    session.attempts = 0;
    session.lockedUntil = null;
    session.lastSentAt = new Date();
    session.sendCount += 1;
    await session.save();

    const user = await User.findById(session.user);
    await sendOtpEmail({ to: user.email, otp, minutes: otpMinutes });

    return res.status(200).json({
      success: true,
      target: session.target,
      expiresIn: otpMinutes * 60,
      resendAfter: resendSeconds,
      code: "code_resent",
      message: "Code resent to your email.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/login-history  (protected)
export const getLoginHistory = async (req, res) => {
  try {
    const history = await LoginHistory.find({ user: req.user._id })
      .sort({ loginAt: -1 })
      .limit(30)
      .lean();
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
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

// GET /api/auth/search/users?q=  — username/fullName lookup for the post tag
// picker. Never returns the caller and caps the result set.
export const searchUsers = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(200).json({ success: true, users: [] });
    }
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ username: rx }, { fullName: rx }],
    })
      .select("username fullName profilePicture")
      .limit(10)
      .lean();

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
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
      status: "published",
    })
      .populate("user", "username fullName profilePicture")
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
