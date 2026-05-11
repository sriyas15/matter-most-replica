import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // Message this file was attached to (null if standalone upload)
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
    },

    // Original filename from the client
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },

    // Stored filename on disk / object storage key
    storedName: {
      type: String,
      required: true,
    },

    // Public URL (CDN / S3 presigned / local)
    url: {
      type: String,
      required: true,
    },

    thumbnailUrl: {
      type: String,
      default: null,
    },

    mimeType: {
      type: String,
      required: true,
    },

    // image | video | audio | document | archive | other
    fileType: {
      type: String,
      enum: ["image", "video", "audio", "document", "archive", "other"],
      default: "other",
    },

    // File size in bytes
    size: {
      type: Number,
      required: true,
    },

    // Image/video dimensions
    width: { type: Number, default: null },
    height: { type: Number, default: null },

    // Video duration in seconds
    duration: { type: Number, default: null },

    // Storage provider: local | s3 | cloudinary | gcs
    storageProvider: {
      type: String,
      enum: ["local", "s3", "cloudinary", "gcs"],
      default: "local",
    },

    // Storage-specific metadata (e.g. S3 bucket, key, region)
    storageMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      select: false,
    },

    // Virus scan status
    scanStatus: {
      type: String,
      enum: ["pending", "clean", "infected", "skipped"],
      default: "pending",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
fileSchema.index({ uploader: 1 });
fileSchema.index({ workspace: 1, createdAt: -1 });
fileSchema.index({ message: 1 });
fileSchema.index({ channel: 1 });

// ── Derive fileType from mimeType before save ─────────────────────────────────
fileSchema.pre("save", function () {
  if (this.isModified("mimeType")) {
    const mime = this.mimeType;
    if (mime.startsWith("image/")) this.fileType = "image";
    else if (mime.startsWith("video/")) this.fileType = "video";
    else if (mime.startsWith("audio/")) this.fileType = "audio";
    else if (["application/zip", "application/x-rar-compressed",
      "application/x-tar"].includes(mime)) this.fileType = "archive";
    else if (mime.startsWith("application/") ||
      mime.startsWith("text/")) this.fileType = "document";
    else this.fileType = "other";
  }
});

// ── Soft delete ───────────────────────────────────────────────────────────────
fileSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const File = mongoose.model("File", fileSchema);
export default File;