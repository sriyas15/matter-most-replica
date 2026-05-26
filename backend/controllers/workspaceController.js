import crypto from "crypto";
import Workspace from "../models/Workspace.js";
import Channel from "../models/Channel.js";
import User from "../models/User.js";

// ── POST /api/workspaces ──────────────────────────────────────────────────────
export const createWorkspace = async (req, res) => {
  try {
    const { name, description, themeColor } = req.body;
    const userId = req.user._id;

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const slugExists = await Workspace.findOne({ slug });
    if (slugExists)
      return res.status(409).json({ success: false, message: "Slug already taken" });

    const workspace = await Workspace.create({
      name,
      slug: slug,
      description,
      themeColor,
      owner: userId,
      members: [{ user: userId, role: "owner" }],
    });

    // Create default #general channel
    const general = await Channel.create({
      workspace: workspace._id,
      name: "general",
      type: "public",
      createdBy: userId,
      members: [{ user: userId, role: "admin" }],
    });

    workspace.defaultChannels.push(general._id);
    await workspace.save();

    // Add workspace to user's list
    await User.findByIdAndUpdate(userId, { $addToSet: { workspaces: workspace._id } });

    res.status(201).json({ success: true, data: workspace });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces ───────────────────────────────────────────────────────
export const getMyWorkspaces = async (req, res) => {
  try {
    const userId = req.user._id;

    const workspaces = await Workspace.find({
      "members.user": userId,
      isArchived: false,
    })
      .select("name slug logo themeColor description memberCount owner members")
      .lean();

    const enriched = workspaces.map((ws) => {
      const member = ws.members.find((m) => m.user.toString() === userId.toString());
      const { members, ...rest } = ws;  // destructure to strip members
      return {
        ...rest,
        myRole: member?.role ?? "member",
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces/:workspaceId ──────────────────────────────────────────
export const getWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId)
      .populate("members.user", "username displayName avatar avatarColor status")
      .populate("defaultChannels", "name displayName type");

    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    // if (!workspace.isMember(userId))
    //   return res.status(403).json({ success: false, message: "Not a member of this workspace" });

    res.json({ success: true, data: workspace });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId ────────────────────────────────────────
export const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    const role = workspace.getMemberRole(userId);
    if (!["owner", "admin"].includes(role))
      return res.status(403).json({ success: false, message: "Insufficient permissions" });

    const allowed = ["name", "description", "themeColor", "allowInviteLink"];
    allowed.forEach((key) => { if (req.body[key] !== undefined) workspace[key] = req.body[key]; });

    if (req.uploadedLogoUrl) workspace.logo = req.uploadedLogoUrl;

    await workspace.save();
    res.json({ success: true, data: workspace });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/workspaces/:workspaceId/invite-link ─────────────────────────────
// Generate a new invite link token
export const generateInviteLink = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId).select("+inviteToken +inviteTokenExpiresAt");
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    const role = workspace.getMemberRole(userId);
    if (!["owner", "admin"].includes(role))
      return res.status(403).json({ success: false, message: "Insufficient permissions" });

    const token = crypto.randomBytes(24).toString("hex");
    workspace.inviteToken = token;
    workspace.inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d
    await workspace.save();

    // const inviteUrl = `${process.env.CLIENT_URL}/invite/${token}`;
    const inviteUrl = `https://matter-most-replica.vercel.app/invite/${token}`;
    res.json({ success: true, inviteUrl, expiresAt: workspace.inviteTokenExpiresAt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/workspaces/join/:inviteToken ────────────────────────────────────
export const joinViaInviteLink = async (req, res) => {
  try {
    const { inviteToken } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findOne({
      inviteToken,
      inviteTokenExpiresAt: { $gt: Date.now() },
      allowInviteLink: true,
      isArchived: false,
    }).select("+inviteToken +inviteTokenExpiresAt");

    if (!workspace)
      return res.status(400).json({ success: false, message: "Invalid or expired invite link" });

    if (workspace.isMember(userId))
      return res.json({ success: true, message: "Already a member", data: workspace });

    workspace.members.push({ user: userId, role: "member" });
    await workspace.save();

    // Auto join all public channels
    await Channel.updateMany(
      {
        workspace: workspace._id,
        type: "public"
      },
      {
        $addToSet: { members: { user: userId, role: "member" } }
      }
    );

    // Add workspace to user
    await User.findByIdAndUpdate(userId, {
      $addToSet: { workspaces: workspace._id },
    });

    res.json({ success: true, data: workspace });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/workspaces/:workspaceId/members/:memberId ─────────────────────
export const removeMember = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    const requesterRole = workspace.getMemberRole(userId);
    const targetRole = workspace.getMemberRole(memberId);

    // Only owner/admin can remove; owner cannot be removed
    if (!["owner", "admin"].includes(requesterRole))
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    if (targetRole === "owner")
      return res.status(403).json({ success: false, message: "Cannot remove the workspace owner" });
    if (requesterRole === "admin" && targetRole === "admin")
      return res.status(403).json({ success: false, message: "Admins cannot remove other admins" });

    workspace.members = workspace.members.filter((m) => m.user.toString() !== memberId.toString());
    await workspace.save();

    await User.findByIdAndUpdate(memberId, { $pull: { workspaces: workspaceId } });

    // Remove from all channels in the workspace
    await Channel.updateMany({ workspace: workspaceId }, { $pull: { members: { user: memberId } } });

    res.json({ success: true, message: "Member removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/members/:memberId/role ─────────────────
export const updateMemberRole = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user._id;

    const allowed = ["admin", "member", "guest"];
    if (!allowed.includes(role))
      return res.status(400).json({ success: false, message: "Invalid role" });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    if (workspace.getMemberRole(userId) !== "owner")
      return res.status(403).json({ success: false, message: "Only the owner can change roles" });

    const member = workspace.members.find((m) => m.user.toString() === memberId.toString());
    if (!member)
      return res.status(404).json({ success: false, message: "Member not found" });

    member.role = role;
    await workspace.save();

    res.json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/workspaces/:workspaceId/leave ─────────────────────────────────
export const leaveWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    if (workspace.getMemberRole(userId) === "owner")
      return res.status(400).json({ success: false, message: "Owner cannot leave; transfer ownership first" });

    workspace.members = workspace.members.filter((m) => m.user.toString() !== userId.toString());
    await workspace.save();

    await User.findByIdAndUpdate(userId, { $pull: { workspaces: workspaceId } });
    await Channel.updateMany({ workspace: workspaceId }, { $pull: { members: { user: userId } } });

    res.json({ success: true, message: "Left workspace" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/archive ────────────────────────────────
export const archiveWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    if (workspace.getMemberRole(userId) !== "owner")
      return res.status(403).json({ success: false, message: "Only the owner can archive" });

    workspace.isArchived = true;
    await workspace.save();

    res.json({ success: true, message: "Workspace archived" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/transfer-ownership ─────────────────────
export const transferOwnership = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { newOwnerId } = req.body;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    if (workspace.getMemberRole(userId) !== "owner")
      return res.status(403).json({ success: false, message: "Only the owner can transfer ownership" });

    const newOwnerMember = workspace.members.find(
      (m) => m.user.toString() === newOwnerId.toString()
    );
    if (!newOwnerMember)
      return res.status(404).json({ success: false, message: "New owner must be a workspace member" });

    // Demote current owner to admin, promote new owner
    workspace.members = workspace.members.map((m) => {
      if (m.user.toString() === userId.toString()) return { ...m.toObject(), role: "admin" };
      if (m.user.toString() === newOwnerId.toString()) return { ...m.toObject(), role: "owner" };
      return m;
    });
    workspace.owner = newOwnerId;
    await workspace.save();

    res.json({ success: true, message: "Ownership transferred" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};