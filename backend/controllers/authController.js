import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import Channel from "../models/Channel.js";

// console.log(process.env.JWT_SECRET)
// ── Helpers ───────────────────────────────────────────────────────────────────
const signAccess = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || "your_jwt_secret", { expiresIn: process.env.JWT_EXPIRES_IN || "15m" });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" });

const setRefreshCookie = (res, token) =>
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  });


// ── POST /api/auth/register ───────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      const field = exists.email === email?.toLowerCase() ? "email" : "username";
      return res.status(409).json({ success: false, message: `${field} already in use` });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      username,
      email,
      password,
      displayName: displayName || username,
      emailVerificationToken: verificationToken,
    });

    // ── CREATE DEFAULT WORKSPACE ──
    const workspace = await Workspace.create({
      name: `${user.displayName}'s Workspace`,
      owner: user._id,
      members: [user._id],
    });

    // ── CREATE DEFAULT GENERAL CHANNEL ──
    await Channel.create({
      name: "general",
      workspace: workspace._id,
      isPrivate: false,
      members: [
        {
          user: user._id,
          role: "admin",
        },
      ],
      createdBy: user._id,
    });

    const accessToken = signAccess(user._id);
    const refreshToken = signRefresh(user._id);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      accessToken,
      user: user.toPublicProfile(),
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (user.isDeactivated)
      return res.status(403).json({ success: false, message: "Account deactivated" });

    user.status   = "online";
    user.lastSeenAt = new Date();
    await user.save({ validateModifiedOnly: true });

    const accessToken  = signAccess(user._id);
    const refreshToken = signRefresh(user._id);
    setRefreshCookie(res, refreshToken);

    res.json({ success: true, accessToken, user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { status: "offline", lastSeenAt: new Date() });
    }
    res.clearCookie("refreshToken");
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ success: false, message: "No refresh token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(payload.id);
    if (!user || user.isDeactivated)
      return res.status(401).json({ success: false, message: "User not found" });

    const newAccess  = signAccess(user._id);
    const newRefresh = signRefresh(user._id);
    setRefreshCookie(res, newRefresh);

    res.json({ success: true, accessToken: newAccess });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/auth/verify-email?token=xxx ─────────────────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token)
      return res.status(400).json({ success: false, message: "Token is required" });

    const user = await User.findOne({ emailVerificationToken: token }).select("+emailVerificationToken");
    if (!user)
      return res.status(400).json({ success: false, message: "Invalid or expired token" });

    user.isEmailVerified        = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateModifiedOnly: true });

    res.json({ success: true, message: "Email verified" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    // Always respond 200 to avoid email enumeration
    if (!user) return res.json({ success: true, message: "If that email exists, a reset link was sent" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken   = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save({ validateModifiedOnly: true });

    // TODO: await sendPasswordResetEmail(user.email, resetToken);

    res.json({ success: true, message: "If that email exists, a reset link was sent" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ success: false, message: "Token and new password are required" });

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user)
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });

    user.password             = password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateModifiedOnly: true });

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};