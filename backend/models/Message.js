import mongoose from "mongoose";

// ── Reaction sub-document ─────────────────────────────────────────────────────
const reactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,   // e.g. "👍" or ":thumbsup:"
      required: true,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    count: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

// ── Attachment sub-document ───────────────────────────────────────────────────
const attachmentSchema = new mongoose.Schema(
  {
    // image | video | audio | file | link_preview
    type: {
      type: String,
      enum: ["image", "video", "audio", "file", "link_preview"],
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    filename: {
      type: String,
      default: "",
    },

    mimeType: {
      type: String,
      default: "",
    },

    // Bytes
    size: {
      type: Number,
      default: 0,
    },

    // Image/video dimensions
    width:  { type: Number, default: null },
    height: { type: Number, default: null },

    // Thumbnail URL for videos / large images
    thumbnailUrl: {
      type: String,
      default: null,
    },

    // For link previews
    linkPreview: {
      title:       { type: String, default: "" },
      description: { type: String, default: "" },
      image:       { type: String, default: "" },
      siteName:    { type: String, default: "" },
    },
  },
  { _id: true }
);

// ── Message schema ────────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Plain text content
    text: {
      type: String,
      default: "",
      maxlength: [16000, "Message cannot exceed 16 000 characters"],
    },

    // Rendered markdown/HTML (optional, can be computed client-side)
    renderedText: {
      type: String,
      default: "",
      select: false,
    },

    // For threaded replies: points to the root message
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Denormalised reply count for thread previews
    replyCount: {
      type: Number,
      default: 0,
    },

    // Latest repliers (shown as avatars in thread preview, max 3)
    replyParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reactions: [reactionSchema],

    attachments: [attachmentSchema],

    // Has this message been edited?
    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    // Soft delete — keep the record so threads don't break
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // system | user | bot
    messageType: {
      type: String,
      enum: ["user", "system", "bot"],
      default: "user",
    },

    // System message payload (e.g. "Sara added Jin to #general")
    systemPayload: {
      action:  { type: String, default: "" },  // e.g. "joined_channel"
      target:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      context: { type: String, default: "" },
    },

    // Users @mentioned in this message
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Channels #referenced in this message
    channelMentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Channel",
      },
    ],

    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
messageSchema.index({ channel: 1, createdAt: -1 });           // main feed query
messageSchema.index({ parentMessage: 1, createdAt: 1 });      // thread replies
messageSchema.index({ sender: 1 });
messageSchema.index({ workspace: 1, createdAt: -1 });
messageSchema.index({ mentions: 1 });                         // @mention lookups
messageSchema.index({ text: "text" });                        // full-text search

// ── Soft delete helper ────────────────────────────────────────────────────────
messageSchema.methods.softDelete = async function () {
  this.isDeleted   = true;
  this.deletedAt   = new Date();
  this.text        = "";
  this.attachments = [];
  return this.save();
};

// ── Add / remove reaction ─────────────────────────────────────────────────────
messageSchema.methods.toggleReaction = async function (emoji, userId) {
  const existing = this.reactions.find((r) => r.emoji === emoji);
  const uid = userId.toString();

  if (existing) {
    const idx = existing.users.map((u) => u.toString()).indexOf(uid);
    if (idx > -1) {
      existing.users.splice(idx, 1);
      existing.count = existing.users.length;
      if (existing.count === 0) {
        this.reactions = this.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      existing.users.push(userId);
      existing.count += 1;
    }
  } else {
    this.reactions.push({ emoji, users: [userId], count: 1 });
  }

  return this.save();
};

const Message = mongoose.model("Message", messageSchema);
export default Message;