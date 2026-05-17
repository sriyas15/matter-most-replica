import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { getIO } from "../socket/index.js";

// ── GET /api/users/me ─────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("workspaces", "name slug logo themeColor");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, data: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/users/me ───────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const allowed = ["displayName", "bio", "phone", "avatarColor"];
    const updates = {};
    allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    // Avatar URL comes from upload middleware
    if (req.uploadedAvatarUrl) updates.avatar = req.uploadedAvatarUrl;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ── PATCH /api/users/me/status ────────────────────────────────────────────────
export const updateStatus = async (req, res) => {
  try {
    const { status, customStatus } = req.body;

    const allowed = ["online", "away", "dnd", "offline"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const update = { status, lastSeenAt: new Date() };

    // Persist customStatus only if the field is sent and the model supports it.
    // (If customStatus is commented-out in the User schema, this is a no-op.)
    if (customStatus !== undefined) {
      update.customStatus = {
        emoji: customStatus.emoji ?? "",
        text:  customStatus.text  ?? "",
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });

    const io = getIO();
    io.emit("presence:user_status", {
      userId:       user._id,
      status:       user.status,
      customStatus: user.customStatus,
    });

    res.json({ success: true, data: { status: user.status, customStatus: user.customStatus } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/users/me/password ──────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Both current and new password are required" });

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces/:workspaceId/users/search?q= ─────────────────────────
// ── GET /api/workspaces/:workspaceId/users/search?q= ─────────────────────────
// q is optional — omitting it (or sending whitespace) lists all workspace members
export const searchUsers = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q, limit = 50 } = req.query;

    const workspace = await Workspace.findById(workspaceId).select("members");
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    const memberIds = workspace.members.map((m) => m.user);

    // Build query — if q is blank/whitespace, return all workspace members
    const trimmed = q?.trim();
    const filter = {
      _id: { $in: memberIds },
      isDeactivated: false,
      ...(trimmed && {
        $or: [
          { username:    { $regex: trimmed, $options: "i" } },
          { displayName: { $regex: trimmed, $options: "i" } },
          { email:       { $regex: trimmed, $options: "i" } },
        ],
      }),
    };

    const users = await User.find(filter)
      .select("username displayName avatar avatarColor status customStatus")
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces/:workspaceId/users/:userId ────────────────────────────
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select("username displayName avatar avatarColor bio status customStatus lastSeenAt createdAt");

    if (!user || user.isDeactivated)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/users/me ──────────────────────────────────────────────────────
export const deactivateAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isDeactivated: true, status: "offline" });
    res.clearCookie("refreshToken");
    res.json({ success: true, message: "Account deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};