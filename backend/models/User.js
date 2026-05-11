import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [5, "Username must be at least 5 characters"],
      maxlength: [32, "Username cannot exceed 32 characters"],
      match: [/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, hyphens"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never returned in queries by default
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: [64, "Display name cannot exceed 64 characters"],
    },

    avatar: {
      type: String,         // URL to uploaded image / gravatar
      default: null,
    },

    // Hex colour used as avatar fallback (like Mattermost initials)
    avatarColor: {
      type: String,
      default: "#5d5fe8",
    },

    bio: {
      type: String,
      maxlength: [256, "Bio cannot exceed 256 characters"],
      default: "Hey there! I'm using Workspace.",
    },

    phone: {
      type: String,
      default: "",
    },

    // online | away | dnd | offline
    status: {
      type: String,
      enum: ["online", "away", "dnd", "offline"],
      default: "offline",
    },

    // Custom status (e.g. "In a meeting 🗓️")
    // customStatus: {
    //   emoji: { type: String, default: "" },
    //   text: { type: String, default: "", maxlength: 100 },
    // },

    // Workspaces this user belongs to (ref → Workspace)
    workspaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
      },
    ],

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    isDeactivated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ workspaces: 1 });

userSchema.pre("save", async function () {
  // Set displayName default
  if (!this.displayName) this.displayName = this.username;

  // Hash password only if modified
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }

});

// ── Instance method: compare password ─────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: safe public profile ──────────────────────────────────────
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName,
    email: this.email,
    avatar: this.avatar,
    avatarColor: this.avatarColor,
    bio: this.bio,
    status: this.status,
    customStatus: this.customStatus,
    lastSeenAt: this.lastSeenAt,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
export default User;