import Notification from "../models/Notification.js";
import mongoose from "mongoose";
import { getIO } from "../socket/index.js";

// ── GET /workspaces/:workspaceId/notifications
// Get paginated notifications for the current user in a workspace
export const getNotifications = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;
    const { unreadOnly = false, page = 1, limit = 30, type } = req.query;

    const query = { recipient: userId, workspace: workspaceId };
    if (unreadOnly === "true") query.isRead = false;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("actor", "username displayName avatar avatarColor")
        .populate("message", "text createdAt")
        .populate("channel", "name displayName type")
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, workspace: workspaceId, isRead: false }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /notifications/unread-count
// Get total unread notification count for the current user (across all workspaces)
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.unreadCount(userId);

    res.json({ success: true, unreadCount: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /workspaces/:workspaceId/notifications/:notificationId/read
// Mark a single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /workspaces/:workspaceId/notifications/read-all
// Mark all notifications in a workspace as read
export const markAllAsRead = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const result = await Notification.markAllRead(userId, workspaceId);

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /workspaces/:workspaceId/notifications/:notificationId
// Delete a single notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /workspaces/:workspaceId/notifications
// Clear all notifications in a workspace for the current user
export const clearAllNotifications = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const result = await Notification.deleteMany({
      recipient: userId,
      workspace: workspaceId,
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /workspaces/:workspaceId/notifications  (internal / service use)
// Create a notification — typically called internally, not from client
export const createNotification = async ({
  recipientId,
  workspaceId,
  type,
  actorId = null,
  messageId = null,
  channelId = null,
  preview = "",
}) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      workspace: workspaceId,
      type,
      actor: actorId,
      message: messageId,
      channel: channelId,
      preview: preview.slice(0, 120),
    });

    // populate for UI
    await notification.populate("actor", "username displayName avatar avatarColor");
    await notification.populate("message", "text createdAt");
    await notification.populate("channel", "name displayName type");

    // 🔥 Emit real-time notification
    const io = getIO();

    io.to(`user:${recipientId}`).emit("notification:new", notification);

    return notification;

  } catch (err) {
    console.error("[createNotification] error:", err.message);
    return null;
  }
};
// ── PATCH /workspaces/:workspaceId/notifications/:notificationId/push-sent
// Mark push notification as sent (called by push worker)
export const markPushSent = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isPushSent: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /workspaces/:workspaceId/notifications/:notificationId/email-sent
// Mark email notification as sent (called by email worker)
export const markEmailSent = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isEmailSent: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};