import DirectMessage from "../models/DirectMessage.js";
import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { createNotification } from "./notificationController.js";

// ── GET /workspaces/:workspaceId/dms
// List all DMs for the current user in a workspace
export const getDMs = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const dms = await DirectMessage.find({
      workspace: workspaceId,
      "participants.user": userId,
      "participants": {
        $elemMatch: { user: userId, isHidden: false },
      },
    })
      .sort({ lastActivityAt: -1 })
      .populate("participants.user", "username displayName avatar avatarColor status customStatus")
      .populate("lastMessage.sender", "username displayName avatar")
      .lean();

    // Attach unread counts
    const dmsWithUnread = await Promise.all(
      dms.map(async (dm) => {
        const participant = dm.participants.find(
          (p) => p.user._id.toString() === userId.toString()
        );
        let unreadCount = 0;
        if (participant?.lastReadAt) {
          unreadCount = await Message.countDocuments({
            channel: dm.channel,
            createdAt: { $gt: participant.lastReadAt },
            sender: { $ne: userId },
            isDeleted: false,
          });
        }
        return { ...dm, unreadCount };
      })
    );

    res.json({ success: true, data: dmsWithUnread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /workspaces/:workspaceId/dms
// Find or create a 1-on-1 DM
export const createOrGetDM = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { recipientId } = req.body;
    const userId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: "recipientId is required" });
    }

    if (userId.toString() === recipientId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot create DM with yourself" });
    }

    const recipient = await User.findById(recipientId).select("username displayName avatar");
    if (!recipient) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }

    // Check for existing DM
    let dm = await DirectMessage.findOne({
      workspace: workspaceId,
      isGroup: false,
      "participants.user": { $all: [userId, recipientId] },
    }).populate("participants.user", "username displayName avatar avatarColor status customStatus");

    if (dm) {
      // If hidden, unhide it
      const selfParticipant = dm.participants.find(
        (p) => p.user._id.toString() === userId.toString()
      );
      if (selfParticipant?.isHidden) {
        await DirectMessage.updateOne(
          { _id: dm._id, "participants.user": userId },
          { $set: { "participants.$.isHidden": false } }
        );
      }
      return res.json({ success: true, data: dm, created: false });
    }

    // Create backing channel
    const channel = await Channel.create({
      workspace: workspaceId,
      name: `dm-${[userId, recipientId].sort().join("-")}`,
      type: "direct",
      createdBy: userId,
      members: [
        { user: userId },
        { user: recipientId },
      ],
    });

    dm = await DirectMessage.create({
      workspace: workspaceId,
      channel: channel._id,
      isGroup: false,
      participants: [
        { user: userId },
        { user: recipientId },
      ],
    });

    await dm.populate("participants.user", "username displayName avatar avatarColor status customStatus");

    res.status(201).json({ success: true, data: dm, created: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /workspaces/:workspaceId/dms/group
// Create a group DM (3–8 participants)
export const createGroupDM = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { participantIds, groupName } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 other participants are required for a group DM",
      });
    }

    const allIds = [...new Set([userId.toString(), ...participantIds])];
    if (allIds.length > 8) {
      return res.status(400).json({ success: false, message: "Group DMs cannot exceed 8 participants" });
    }

    const channel = await Channel.create({
      workspace: workspaceId,
      name: `group-dm-${Date.now()}`,
      type: "group",
      createdBy: userId,
      members: allIds.map((id) => ({ user: id })),
    });

    const dm = await DirectMessage.create({
      workspace: workspaceId,
      channel: channel._id,
      isGroup: true,
      groupName: groupName || "",
      participants: allIds.map((id) => ({ user: id })),
    });

    await dm.populate("participants.user", "username displayName avatar avatarColor status customStatus");

    res.status(201).json({ success: true, data: dm });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /workspaces/:workspaceId/dms/:dmId/messages
// Fetch messages in a DM (paginated)
export const getDMMessages = async (req, res) => {
  try {
    const { dmId } = req.params;
    const userId = req.user._id;
    const { before, limit = 50 } = req.query;

    const dm = await DirectMessage.findById(dmId);
    if (!dm) return res.status(404).json({ success: false, message: "DM not found" });

    const isMember = dm.participants.some((p) => p.user.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ success: false, message: "Not a participant" });

    const query = {
      channel: dm.channel,
      isDeleted: false,
      parentMessage: null,
    };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("sender", "username displayName avatar avatarColor")
      .lean();

    // Update lastOpenedAt
    await DirectMessage.updateOne(
      { _id: dmId, "participants.user": userId },
      { $set: { "participants.$.lastOpenedAt": new Date() } }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /workspaces/:workspaceId/dms/:dmId/read
// Mark all messages in a DM as read
export const markDMRead = async (req, res) => {
  try {
    const { dmId } = req.params;
    const userId = req.user._id;

    const dm = await DirectMessage.findById(dmId);
    if (!dm) return res.status(404).json({ success: false, message: "DM not found" });

    const isMember = dm.participants.some((p) => p.user.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ success: false, message: "Not a participant" });

    const lastMessage = await Message.findOne({ channel: dm.channel, isDeleted: false })
      .sort({ createdAt: -1 })
      .select("_id createdAt");

    await DirectMessage.updateOne(
      { _id: dmId, "participants.user": userId },
      {
        $set: {
          "participants.$.lastReadAt": lastMessage?.createdAt ?? new Date(),
          "participants.$.lastReadMessageId": lastMessage?._id ?? null,
        },
      }
    );

    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /workspaces/:workspaceId/dms/:dmId/hide
// Hide a DM from the sidebar
export const hideDM = async (req, res) => {
  try {
    const { dmId } = req.params;
    const userId = req.user._id;

    const dm = await DirectMessage.findById(dmId);
    if (!dm) return res.status(404).json({ success: false, message: "DM not found" });

    const isMember = dm.participants.some((p) => p.user.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ success: false, message: "Not a participant" });

    await DirectMessage.updateOne(
      { _id: dmId, "participants.user": userId },
      { $set: { "participants.$.isHidden": true } }
    );

    res.json({ success: true, message: "DM hidden" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};