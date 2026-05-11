import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// ── Ensure upload dir exists ──────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Storage engine ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const unique   = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

// ── File filter ───────────────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const blocked = ["application/x-msdownload", "application/x-sh", "text/x-shellscript"];
  if (blocked.includes(file.mimetype)) {
    return cb(new Error("File type not allowed"), false);
  }
  cb(null, true);
};

const multerConfig = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 25) * 1024 * 1024 },
});

// ── Multer middleware variants ────────────────────────────────────────────────
export const uploadSingle = multerConfig.single("file");

export const uploadAvatar = [
  multerConfig.single("avatar"),
  (req, _res, next) => {
    if (req.file) {
      // Attach a normalised URL for the controller
      const base = process.env.SERVER_URL || "http://localhost:5000";
      req.uploadedAvatarUrl = `${base}/uploads/${req.file.filename}`;
    }
    next();
  },
];

export const uploadLogo = [
  multerConfig.single("logo"),
  (req, _res, next) => {
    if (req.file) {
      const base = process.env.SERVER_URL || "http://localhost:5000";
      req.uploadedLogoUrl = `${base}/uploads/${req.file.filename}`;
    }
    next();
  },
];

/*
 * After uploadSingle runs, attach a normalised `req.uploadedFile` object
 * that matches what fileController.uploadFile expects.
 *
 * Swap this middleware out for an S3/Cloudinary version in production —
 * the controller interface stays the same.
 */
export const processUploadedFile = (req, _res, next) => {
  if (!req.file) return next();

  const base = process.env.SERVER_URL || "http://localhost:5000";
  req.uploadedFile = {
    originalName:     req.file.originalname,
    storedName:       req.file.filename,
    url:              `${base}/uploads/${req.file.filename}`,
    thumbnailUrl:     null,
    mimeType:         req.file.mimetype,
    size:             req.file.size,
    width:            null,
    height:           null,
    duration:         null,
    storageProvider:  "local",
    storageMeta:      { path: req.file.path },
  };
  next();
};