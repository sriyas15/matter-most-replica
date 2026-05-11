import mongoose from "mongoose";

/**
 * DirectMessage
 * Represents a 1-on-1 or small-group DM conversation.
 * Individual messages inside DMs are stored in the Message collection
 * with messageType: "user" and a reference to this DM via channel field.
 *
 * We model DMs as a special channel type ("direct" | "group") in Channel.js,
 * but this schema stores the DM-specific metadata separately for clarity.
 */
const directMessageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // The backing Channel document (type: "direct" or "group")
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },

    // Participants (2 for DM, 3–8 for group DM)
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        // Has this participant hidden/closed the DM from their sidebar?
        isHidden: {
          type: Boolean,
          default: false,
        },

        // Last time this participant opened the conversation
        lastOpenedAt: {
          type: Date,
          default: null,
        },

        // Last message id they've read
        lastReadMessageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
          default: null,
        },

        lastReadAt: {
          type: Date,
          default: null,
        },
      },
    ],

    // true = group DM (3+ people), false = 1-on-1
    isGroup: {
      type: Boolean,
      default: false,
    },

    // Optional name for group DMs
    groupName: {
      type: String,
      maxlength: [64],
      default: "",
    },

    // Last message preview (denormalised)
    lastMessage: {
      text:   { type: String,   default: "" },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      sentAt: { type: Date,     default: null },
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
directMessageSchema.index({ workspace: 1, "participants.user": 1 });
directMessageSchema.index({ channel: 1 }, { unique: true });
directMessageSchema.index({ lastActivityAt: -1 });

// ── Static: find or create a 1-on-1 DM ───────────────────────────────────────
directMessageSchema.statics.findOrCreate = async function (
  workspaceId,
  userIdA,
  userIdB,
  channelId
) {
  const existing = await this.findOne({
    workspace: workspaceId,
    isGroup: false,
    "participants.user": { $all: [userIdA, userIdB] },
  });

  if (existing) return existing;

  return this.create({
    workspace: workspaceId,
    channel: channelId,
    isGroup: false,
    participants: [
      { user: userIdA },
      { user: userIdB },
    ],
  });
};

// ── Instance: get unread count for a user ────────────────────────────────────
directMessageSchema.methods.getUnreadCount = async function (userId) {
  const Message = mongoose.model("Message");
  const participant = this.participants.find(
    (p) => p.user.toString() === userId.toString()
  );
  if (!participant || !participant.lastReadAt) return 0;

  return Message.countDocuments({
    channel: this.channel,
    createdAt: { $gt: participant.lastReadAt },
    sender: { $ne: userId },
    isDeleted: false,
  });
};

const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);
export default DirectMessage;