import mongoose from "mongoose";

// ── Channel member sub-document ───────────────────────────────────────────────
const channelMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Channel-level role
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    // Last message this member has read (for unread counts)
    lastReadAt: {
      type: Date,
      default: null,
    },

    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Muted channels don't show notifications
    isMuted: {
      type: Boolean,
      default: false,
    },

    // Favourited channels are pinned to top of sidebar
    isFavorited: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// ── Channel schema ────────────────────────────────────────────────────────────
const channelSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    name: {
      type: String,
      required: [true, "Channel name is required"],
      trim: true,
      minlength: [1, "Channel name must be at least 1 character"],
      maxlength: [64, "Channel name cannot exceed 64 characters"],
      // Mattermost-style: lowercase, no spaces
      // match: [/^[a-z0-9_-]+$/, "Channel name can only contain lowercase letters, numbers, underscores, hyphens"],
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: [64],
    },

    description: {
      type: String,
      maxlength: [512, "Description cannot exceed 512 characters"],
      default: "",
    },

    purpose: {
      type: String,
      maxlength: [256],
      default: "",
    },

    // public | private | direct | group
    type: {
      type: String,
      enum: ["public", "private", "direct", "group"],
      default: "public",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [channelMemberSchema],

    // Pinned messages (refs to Message)
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],

    // Last activity — used to sort channels in sidebar
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    // Last message preview (denormalised to avoid extra query)
    lastMessage: {
      text: { type: String, default: "" },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      sentAt: { type: Date, default: null },
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    isReadOnly: {
      type: Boolean,
      default: false,
    },

    // Header / banner image URL
    headerImage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound unique index: one channel name per workspace ─────────────────────
channelSchema.index({ workspace: 1, name: 1 }, { unique: true });
channelSchema.index({ workspace: 1, type: 1 });
channelSchema.index({ "members.user": 1 });
channelSchema.index({ lastActivityAt: -1 });

// ── Default displayName to name ───────────────────────────────────────────────
channelSchema.pre("save", function () {
  if (!this.displayName) this.displayName = this.name;
});

// ── Instance helpers ──────────────────────────────────────────────────────────
channelSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

channelSchema.methods.getMember = function (userId) {
  return this.members.find((m) => m.user.toString() === userId.toString()) ?? null;
};

const Channel = mongoose.model("Channel", channelSchema);
export default Channel;