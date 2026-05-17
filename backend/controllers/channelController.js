import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";
import Message from "../models/Message.js";
import { getIO } from "../socket/index.js";

// ── Helper: emit member count update to all clients in channel room ───────────
// Emitted after any join / leave / add-member so every open tab updates
// the badge in ChatHeader without a page refresh.
const emitMemberUpdate = (channelId, memberCount) => {
  try {
    getIO()
      .to(`channel:${channelId}`)
      .emit("channel:member_updated", { channelId, memberCount });
  } catch {
    // socket not initialised yet (e.g. unit-test env) — safe to ignore
  }
};

// ── POST /api/workspaces/:workspaceId/channels ────────────────────────────────
export const createChannel = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, displayName, description, purpose, type = "public", memberIds = [] } = req.body;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    const role = workspace.getMemberRole(userId);
    if (!role)
      return res.status(403).json({ success: false, message: "Not a workspace member" });

    if (type === "private" && !["owner", "admin"].includes(role))
      return res.status(403).json({ success: false, message: "Only admins can create private channels" });

    const members = [
      { user: userId, role: "admin" },
      ...memberIds
        .filter((id) => id.toString() !== userId.toString())
        .map((id) => ({ user: id, role: "member" })),
    ];

    const channel = await Channel.create({
      workspace: workspaceId,
      name,
      displayName: displayName || name,
      description,
      purpose,
      type,
      createdBy: userId,
      members,
    });

    await channel.populate("members.user", "username displayName avatar avatarColor");

    res.status(201).json({ success: true, data: channel });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: "Channel name already exists in this workspace" });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces/:workspaceId/channels ─────────────────────────────────
export const getChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;
    const { type } = req.query;

    const query = {
      workspace: workspaceId,
      isArchived: false,
      $or: [{ type: "public" }, { "members.user": userId }],
    };
    if (type) query.type = type;

    const channels = await Channel.find(query)
      .select("name displayName description type members lastActivityAt lastMessage isReadOnly")
      .sort({ lastActivityAt: -1 })
      .lean();

    const enriched = channels.map((ch) => {
      const member = ch.members.find((m) => m.user.toString() === userId.toString());
      return {
        ...ch,
        isMember:    !!member,
        isMuted:     member?.isMuted ?? false,
        isFavorited: member?.isFavorited ?? false,
        memberCount: ch.members.length,
        members: undefined,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces/:workspaceId/channels/:channelId ──────────────────────
export const getChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId)
      .populate("members.user", "username displayName avatar avatarColor status")
      .populate("pinnedMessages");

    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    if (channel.type !== "public" && !channel.isMember(userId))
      return res.status(403).json({ success: false, message: "Not a channel member" });

    res.json({ success: true, data: channel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/channels/:channelId ────────────────────
export const updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    const member = channel.getMember(userId);
    if (!member || member.role !== "admin")
      return res.status(403).json({ success: false, message: "Channel admin only" });

    const allowed = ["displayName", "description", "purpose", "isReadOnly", "headerImage"];
    allowed.forEach((key) => { if (req.body[key] !== undefined) channel[key] = req.body[key]; });

    await channel.save();
    res.json({ success: true, data: channel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/workspaces/:workspaceId/channels/:channelId/join ────────────────
export const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    if (channel.type === "private")
      return res.status(403).json({ success: false, message: "Cannot self-join a private channel" });

    if (channel.isMember(userId))
      return res.json({ success: true, message: "Already a member", data: channel });

    channel.members.push({ user: userId });
    await channel.save();

    await Message.create({
      channel: channel._id,
      workspace: channel.workspace,
      sender: userId,
      messageType: "system",
      systemPayload: { action: "joined_channel" },
    });

    // ── Real-time: tell every open tab in this channel about the new count ──
    emitMemberUpdate(channelId, channel.members.length);

    res.json({ success: true, data: channel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/workspaces/:workspaceId/channels/:channelId/leave ─────────────
export const leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    if (!channel.isMember(userId))
      return res.status(400).json({ success: false, message: "Not a member" });

    channel.members = channel.members.filter((m) => m.user.toString() !== userId.toString());
    await channel.save();

    await Message.create({
      channel: channel._id,
      workspace: channel.workspace,
      sender: userId,
      messageType: "system",
      systemPayload: { action: "left_channel" },
    });

    // ── Real-time: broadcast updated count ──────────────────────────────────
    emitMemberUpdate(channelId, channel.members.length);

    res.json({ success: true, message: "Left channel" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/workspaces/:workspaceId/channels/:channelId/members ─────────────
// Add one or more workspace members to a channel directly (admin only).
// Body: { userIds: string[] }
export const addChannelMembers = async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params;
    const requesterId = req.user._id;
    const { userIds = [] } = req.body;

    if (!userIds.length)
      return res.status(400).json({ success: false, message: "No userIds provided" });

    const channel = await Channel.findById(channelId);
    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    // Only channel admins (or workspace owners/admins) may add members
    const channelMember = channel.getMember(requesterId);
    const workspace = await Workspace.findById(workspaceId);
    const wsRole = workspace?.getMemberRole(requesterId);

    const isChannelAdmin = channelMember?.role === "admin";
    const isWsElevated   = ["owner", "admin"].includes(wsRole);

    if (!isChannelAdmin && !isWsElevated)
      return res.status(403).json({ success: false, message: "Channel admin only" });

    // Only allow adding existing workspace members
    const workspaceMemberIds = workspace.members.map((m) => m.user.toString());
    const validIds = userIds.filter((id) => workspaceMemberIds.includes(id.toString()));

    if (!validIds.length)
      return res.status(400).json({ success: false, message: "None of the users are workspace members" });

    let added = 0;
    for (const uid of validIds) {
      if (!channel.isMember(uid)) {
        channel.members.push({ user: uid, role: "member" });
        added++;
      }
    }

    if (added > 0) {
      await channel.save();

      // System message for each added user
      for (const uid of validIds) {
        await Message.create({
          channel: channel._id,
          workspace: channel.workspace,
          sender: requesterId,
          messageType: "system",
          systemPayload: { action: "added_to_channel", targetUser: uid },
        }).catch(() => {});
      }

      // ── Real-time: push new count to all listeners in the channel room ──
      emitMemberUpdate(channelId, channel.members.length);
    }

    await channel.populate("members.user", "username displayName avatar avatarColor status");

    res.json({
      success: true,
      message: `${added} member(s) added`,
      data: channel,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/channels/:channelId/archive ────────────
export const archiveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    const member = channel.getMember(userId);
    if (!member || member.role !== "admin")
      return res.status(403).json({ success: false, message: "Channel admin only" });

    channel.isArchived = true;
    await channel.save();

    res.json({ success: true, message: "Channel archived" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/channels/:channelId/members/me ─────────
export const updateMyMembership = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const { isMuted, isFavorited } = req.body;

    const channel = await Channel.findOneAndUpdate(
      { _id: channelId, "members.user": userId },
      {
        $set: {
          ...(isMuted     !== undefined && { "members.$.isMuted":     isMuted }),
          ...(isFavorited !== undefined && { "members.$.isFavorited": isFavorited }),
        },
      },
      { new: true }
    );

    if (!channel)
      return res.status(404).json({ success: false, message: "Channel or membership not found" });

    res.json({ success: true, message: "Preferences updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/channels/:channelId/read ───────────────
export const markChannelRead = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const lastMessage = await Message.findOne({ channel: channelId, isDeleted: false })
      .sort({ createdAt: -1 })
      .select("_id createdAt");

    await Channel.updateOne(
      { _id: channelId, "members.user": userId },
      {
        $set: {
          "members.$.lastReadAt":        lastMessage?.createdAt ?? new Date(),
          "members.$.lastReadMessageId": lastMessage?._id ?? null,
        },
      }
    );

    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};