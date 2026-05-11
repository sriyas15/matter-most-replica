import Message from "../models/Message.js";
import Channel from "../models/Channel.js";
import { createNotification } from "./notificationController.js";

// ── POST /api/workspaces/:workspaceId/channels/:channelId/messages ────────────
export const sendMessage = async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params;
    const { text, parentMessageId, attachments = [], mentions = [], channelMentions = [] } = req.body;
    const userId = req.user._id;

    if (!text?.trim() && !attachments.length)
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const channel = await Channel.findById(channelId);
    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    if (!channel.isMember(userId))
      return res.status(403).json({ success: false, message: "Not a channel member" });

    if (channel.isReadOnly) {
      const member = channel.getMember(userId);
      if (member?.role !== "admin")
        return res.status(403).json({ success: false, message: "Channel is read-only" });
    }

    // Validate parent message for threads
    if (parentMessageId) {
      const parent = await Message.findOne({ _id: parentMessageId, channel: channelId, isDeleted: false });
      if (!parent)
        return res.status(404).json({ success: false, message: "Parent message not found" });
    }

    const message = await Message.create({
      channel:        channelId,
      workspace:      workspaceId,
      sender:         userId,
      text:           text?.trim() ?? "",
      parentMessage:  parentMessageId || null,
      attachments,
      mentions,
      channelMentions,
    });

    await message.populate("sender", "username displayName avatar avatarColor");

    // Update parent thread stats
    if (parentMessageId) {
      await Message.findByIdAndUpdate(parentMessageId, {
        $inc: { replyCount: 1 },
        $addToSet: { replyParticipants: userId },
      });
    }

    // Update channel last activity
    await Channel.findByIdAndUpdate(channelId, {
      lastActivityAt: new Date(),
      lastMessage: {
        text:   text?.slice(0, 100) ?? "",
        sender: userId,
        sentAt: new Date(),
      },
    });

    // Fire mention notifications (non-blocking)
    if (mentions.length) {
      mentions.forEach((mentionedUserId) => {
        if (mentionedUserId.toString() !== userId.toString()) {
          createNotification({
            recipientId: mentionedUserId,
            workspaceId,
            type:        "mention",
            actorId:     userId,
            messageId:   message._id,
            channelId,
            preview:     text?.slice(0, 120) ?? "",
          });
        }
      });
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces/:workspaceId/channels/:channelId/messages ─────────────
export const getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;
    const { before, after, limit = 50 } = req.query;

    const channel = await Channel.findById(channelId).select("type members");
    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    if (channel.type !== "public" && !channel.isMember(userId))
      return res.status(403).json({ success: false, message: "Not a channel member" });

    const query = { channel: channelId, isDeleted: false, parentMessage: null };
    if (before) query.createdAt = { $lt: new Date(before) };
    if (after)  query.createdAt = { ...(query.createdAt || {}), $gt: new Date(after) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("sender", "username displayName avatar avatarColor")
      .populate("replyParticipants", "username displayName avatar")
      .lean();

    res.json({ success: true, data: messages.reverse(), hasMore: messages.length === Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces/:workspaceId/channels/:channelId/messages/:messageId/thread
export const getThread = async (req, res) => {
  try {
    const { channelId, messageId } = req.params;
    const { limit = 50, before } = req.query;

    const root = await Message.findOne({ _id: messageId, channel: channelId })
      .populate("sender", "username displayName avatar avatarColor");
    if (!root)
      return res.status(404).json({ success: false, message: "Message not found" });

    const query = { parentMessage: messageId, isDeleted: false };
    if (before) query.createdAt = { $lt: new Date(before) };

    const replies = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(Number(limit))
      .populate("sender", "username displayName avatar avatarColor")
      .lean();

    res.json({ success: true, data: { root, replies } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/channels/:channelId/messages/:messageId
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text?.trim())
      return res.status(400).json({ success: false, message: "Message text cannot be empty" });

    const message = await Message.findOne({ _id: messageId, isDeleted: false });
    if (!message)
      return res.status(404).json({ success: false, message: "Message not found" });

    if (message.sender.toString() !== userId.toString())
      return res.status(403).json({ success: false, message: "Can only edit your own messages" });

    if (message.messageType !== "user")
      return res.status(400).json({ success: false, message: "Cannot edit system messages" });

    message.text     = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate("sender", "username displayName avatar avatarColor");
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/workspaces/:workspaceId/channels/:channelId/messages/:messageId
export const deleteMessage = async (req, res) => {
  try {
    const { messageId, workspaceId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, isDeleted: false });
    if (!message)
      return res.status(404).json({ success: false, message: "Message not found" });

    const isOwner = message.sender.toString() === userId.toString();
    const isAdmin = req.userWorkspaceRole === "admin" || req.userWorkspaceRole === "owner";

    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: "Not authorized" });

    await message.softDelete();

    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/workspaces/:workspaceId/channels/:channelId/messages/:messageId/react
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji)
      return res.status(400).json({ success: false, message: "Emoji is required" });

    const message = await Message.findOne({ _id: messageId, isDeleted: false });
    if (!message)
      return res.status(404).json({ success: false, message: "Message not found" });

    await message.toggleReaction(emoji, userId);

    // Notify message author (if someone else reacted)
    if (message.sender.toString() !== userId.toString()) {
      createNotification({
        recipientId: message.sender,
        workspaceId: message.workspace,
        type:        "reaction",
        actorId:     userId,
        messageId:   message._id,
        channelId:   message.channel,
        preview:     emoji,
      });
    }

    const updated = await Message.findById(messageId).select("reactions");
    res.json({ success: true, data: updated.reactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/workspaces/:workspaceId/channels/:channelId/messages/:messageId/pin
export const pinMessage = async (req, res) => {
  try {
    const { channelId, messageId } = req.params;
    const userId = req.user._id;

    const channel = await Channel.findById(channelId);
    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });

    const member = channel.getMember(userId);
    if (!member || member.role !== "admin")
      return res.status(403).json({ success: false, message: "Channel admin only" });

    const message = await Message.findOne({ _id: messageId, channel: channelId, isDeleted: false });
    if (!message)
      return res.status(404).json({ success: false, message: "Message not found" });

    const alreadyPinned = channel.pinnedMessages.some((id) => id.toString() === messageId);

    if (alreadyPinned) {
      channel.pinnedMessages = channel.pinnedMessages.filter((id) => id.toString() !== messageId);
      message.isPinned = false;
    } else {
      channel.pinnedMessages.push(messageId);
      message.isPinned = true;
    }

    await Promise.all([channel.save(), message.save()]);

    res.json({ success: true, isPinned: message.isPinned });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/workspaces/:workspaceId/messages/search?q= ──────────────────────
export const searchMessages = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q, channelId, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    if (!q?.trim())
      return res.status(400).json({ success: false, message: "Query is required" });

    const query = {
      workspace:  workspaceId,
      isDeleted:  false,
      $text:      { $search: q },
    };
    if (channelId) query.channel = channelId;

    const skip = (Number(page) - 1) * Number(limit);

    const [messages, total] = await Promise.all([
      Message.find(query, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "username displayName avatar")
        .populate("channel", "name displayName")
        .lean(),
      Message.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};