import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    /**
     * Notification types:
     *  mention          — someone @mentioned you in a channel
     *  direct_message   — new DM from someone
     *  thread_reply     — reply in a thread you're following
     *  channel_invite   — invited to a channel
     *  workspace_invite — invited to a workspace
     *  reaction         — someone reacted to your message
     *  system           — admin / system alert
     */
    type: {
      type: String,
      enum: [
        "mention",
        "direct_message",
        "thread_reply",
        "channel_invite",
        "workspace_invite",
        "reaction",
        "system",
      ],
      required: true,
    },

    // Who triggered this notification (null for system)
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // The message that triggered the notification (if applicable)
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // The channel where the event happened
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
    },

    // Short preview text (e.g. first 120 chars of the message)
    preview: {
      type: String,
      maxlength: 120,
      default: "",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },

    // Push notification delivery status
    isPushSent: {
      type: Boolean,
      default: false,
    },

    // Email delivery status
    isEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, workspace: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // TTL 90 days

// ── Static: mark all as read for a user ──────────────────────────────────────
notificationSchema.statics.markAllRead = async function (userId, workspaceId) {
  return this.updateMany(
    { recipient: userId, workspace: workspaceId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// ── Static: unread count ──────────────────────────────────────────────────────
notificationSchema.statics.unreadCount = async function (userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;