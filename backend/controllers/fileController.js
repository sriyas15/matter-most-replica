import File from "../models/File.js";
import Message from "../models/Message.js";
import path from "path";

// ── POST /workspaces/:workspaceId/files/upload
// Upload a file (expects middleware to handle multipart; req.uploadedFile = processed file info)
export const uploadFile = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { messageId, channelId } = req.body;
    const userId = req.user._id;

    // Expect upload middleware (e.g. multer + S3) to attach this
    const uploaded = req.uploadedFile;
    if (!uploaded) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const file = await File.create({
      uploader: userId,
      workspace: workspaceId,
      message: messageId || null,
      channel: channelId || null,
      originalName: uploaded.originalName,
      storedName: uploaded.storedName,
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl || null,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      width: uploaded.width || null,
      height: uploaded.height || null,
      duration: uploaded.duration || null,
      storageProvider: uploaded.storageProvider || "local",
      storageMeta: uploaded.storageMeta || {},
    });

    res.status(201).json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /workspaces/:workspaceId/files
// List files in a workspace (optionally filter by channel or uploader)
export const getWorkspaceFiles = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { channelId, uploaderId, fileType, page = 1, limit = 20 } = req.query;

    const query = { workspace: workspaceId, isDeleted: false };
    if (channelId) query.channel = channelId;
    if (uploaderId) query.uploader = uploaderId;
    if (fileType) query.fileType = fileType;

    const skip = (Number(page) - 1) * Number(limit);

    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("uploader", "username displayName avatar")
        .populate("channel", "name displayName")
        .lean(),
      File.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: files,
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

// ── GET /workspaces/:workspaceId/files/:fileId
// Get a single file's metadata
export const getFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findOne({ _id: fileId, isDeleted: false })
      .populate("uploader", "username displayName avatar")
      .populate("channel", "name displayName")
      .populate("message", "text createdAt");

    if (!file) return res.status(404).json({ success: false, message: "File not found" });

    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /workspaces/:workspaceId/files/:fileId
// Soft-delete a file (uploader or workspace admin only)
export const deleteFile = async (req, res) => {
  try {
    const { fileId, workspaceId } = req.params;
    const userId = req.user._id;

    const file = await File.findOne({ _id: fileId, workspace: workspaceId, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found" });

    const isOwner = file.uploader.toString() === userId.toString();
    const isAdmin = req.userWorkspaceRole === "admin" || req.userWorkspaceRole === "owner";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this file" });
    }

    await file.softDelete();

    // Remove from any message attachments
    if (file.message) {
      await Message.updateOne(
        { _id: file.message },
        { $pull: { attachments: { url: file.url } } }
      );
    }

    res.json({ success: true, message: "File deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /workspaces/:workspaceId/channels/:channelId/files
// Get all non-deleted files in a channel
export const getChannelFiles = async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params;
    const { fileType, page = 1, limit = 20 } = req.query;

    const query = { workspace: workspaceId, channel: channelId, isDeleted: false };
    if (fileType) query.fileType = fileType;

    const skip = (Number(page) - 1) * Number(limit);

    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("uploader", "username displayName avatar avatarColor")
        .lean(),
      File.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: files,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /workspaces/:workspaceId/files/:fileId/scan
// Update virus scan status (called by scan worker/webhook)
export const updateScanStatus = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { scanStatus } = req.body;

    const allowed = ["pending", "clean", "infected", "skipped"];
    if (!allowed.includes(scanStatus)) {
      return res.status(400).json({ success: false, message: "Invalid scanStatus" });
    }

    const file = await File.findByIdAndUpdate(
      fileId,
      { scanStatus },
      { new: true }
    );

    if (!file) return res.status(404).json({ success: false, message: "File not found" });

    // If infected, soft-delete automatically
    if (scanStatus === "infected") {
      await file.softDelete();
    }

    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};