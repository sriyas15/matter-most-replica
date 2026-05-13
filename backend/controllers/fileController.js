import File from "../models/File.js";
import Message from "../models/Message.js";
import path from "path";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary.js";

// ── POST /workspaces/:workspaceId/files/upload
// Upload a file (expects middleware to handle multipart; req.uploadedFile = processed file info)
export const uploadFile = async (req, res) => {
  try {
    const { workspaceId } = req.params;
 
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }
 
    const { buffer, mimetype, originalname, size } = req.file;
 
    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      buffer,
      mimetype,
      originalname,
      `workspaces/${workspaceId}`
    );
 
    // Persist metadata in MongoDB
    const file = await File.create({
      uploader:        req.user._id,
      workspace:       workspaceId,
      originalName:    originalname,
      storedName:      result.public_id,
      url:             result.secure_url,
      mimeType:        mimetype,
      size,
      storageProvider: "cloudinary",
      storageMeta:     {
        publicId:     result.public_id,
        resourceType: result.resource_type,
        format:       result.format,
        version:      result.version,
      },
      // Image / video dimensions when available
      width:  result.width  || null,
      height: result.height || null,
      // Cloudinary doesn't return duration for audio via upload_stream;
      // leave null — can be enriched later via a video info call if needed
      duration: result.duration || null,
      scanStatus: "skipped", // integrate a virus-scan service here if needed
    });
 
    return res.status(201).json({ success: true, data: file });
  } catch (err) {
    console.error("[uploadFile]", err);
    return res.status(500).json({ success: false, message: err.message || "Upload failed" });
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
    const file = await File.findOne({
      _id:       req.params.fileId,
      workspace: req.params.workspaceId,
      isDeleted: false,
    });
    if (!file) return res.status(404).json({ success: false, message: "File not found" });
    return res.json({ success: true, data: file });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /workspaces/:workspaceId/files/:fileId
// Soft-delete a file (uploader or workspace admin only)

export const deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id:       req.params.fileId,
      workspace: req.params.workspaceId,
      isDeleted: false,
    });
 
    if (!file) return res.status(404).json({ success: false, message: "File not found" });
 
    // Only uploader or admin may delete
    const isOwner   = file.uploader.toString() === req.user._id.toString();
    const isElevated = ["owner", "admin"].includes(req.userWorkspaceRole);
    if (!isOwner && !isElevated) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
 
    // Remove from Cloudinary
    if (file.storageMeta?.publicId) {
      await deleteFromCloudinary(
        file.storageMeta.publicId,
        file.storageMeta.resourceType || "raw"
      );
    }
 
    await file.softDelete();
    return res.json({ success: true, message: "File deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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