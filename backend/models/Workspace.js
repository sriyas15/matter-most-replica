import mongoose from "mongoose";

// ── Member sub-document ───────────────────────────────────────────────────────
const workspaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Role within this workspace
    role: {
      type: String,
      enum: ["owner", "admin", "member", "guest"],
      default: "member",
    },

    // When the user joined this workspace
    joinedAt: {
      type: Date,
      default: Date.now,
    },

    // Invited by whom
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Per-workspace notification preferences
    notificationPreferences: {
      allMessages:    { type: Boolean, default: false },
      mentionsOnly:   { type: Boolean, default: true  },
      nothing:        { type: Boolean, default: false },
      desktopSound:   { type: Boolean, default: true  },
      mobilePush:     { type: Boolean, default: true  },
    },
  },
  { _id: false }
);

// ── Workspace schema ──────────────────────────────────────────────────────────
const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      minlength: [2, "Workspace name must be at least 2 characters"],
      maxlength: [64, "Workspace name cannot exceed 64 characters"],
    },

    // URL-safe slug used in routes, e.g. /dev-workspace/general
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // match: [/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"],
    },

    description: {
      type: String,
      maxlength: [256, "Description cannot exceed 256 characters"],
      default: "",
    },

    logo: {
      type: String,   // URL
      default: null,
    },

    // Hex brand colour for this workspace
    themeColor: {
      type: String,
      default: "#5d5fe8",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [workspaceMemberSchema],

    // Invite link token (single-use or expirable)
    inviteToken: {
      type: String,
      default: null,
      select: false,
    },

    inviteTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    // Whether anyone with the invite link can join
    allowInviteLink: {
      type: Boolean,
      default: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    // Default channels auto-joined on invite (refs to Channel)
    defaultChannels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Channel",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ "members.user": 1 });

// ── Virtual: member count ─────────────────────────────────────────────────────
workspaceSchema.virtual("memberCount").get(function () {
  return this.members?.length ?? 0;
});

// ── Instance helper: check membership ────────────────────────────────────────
workspaceSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member?.role ?? null;
};


const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;    