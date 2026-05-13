import multer from "multer";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_MIME_TYPES = [
  // Images
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/gif",
  "image/webp",
  // Video
  "video/mp4",
  "video/webm",
  "video/ogg",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
];

const fileFilter = (_req, file, cb) => {
  if (ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

// Keep files in memory — we stream them straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

export default upload;