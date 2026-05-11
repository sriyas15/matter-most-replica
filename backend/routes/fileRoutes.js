import { Router } from "express";
import {
  uploadFile,
  getWorkspaceFiles,
  getFile,
  deleteFile,
  getChannelFiles,
  updateScanStatus,
} from "../controllers/fileController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import { requireServiceToken } from "../middlewares/serviceTokenMiddleware.js";
import { uploadSingle } from "../middlewares/uploadMiddleware.js";   // multer/S3 single file

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspaceMember);

// ── /api/workspaces/:workspaceId/files ────────────────────────────────────────
router.get ("/",            getWorkspaceFiles);          // ?fileType=image&channelId=&page=
router.post("/upload",      uploadSingle, uploadFile);   // multipart/form-data

// ── /api/workspaces/:workspaceId/channels/:channelId/files ────────────────────
// (mounted separately via channel sub-router — see index.js)
router.get("/channel/:channelId", getChannelFiles);      // ?fileType=&page=

// ── Single file ───────────────────────────────────────────────────────────────
router.get   ("/:fileId",          getFile);
router.delete("/:fileId",          deleteFile);

// ── Internal: virus scan callback (worker auth only) ─────────────────────────
router.patch("/:fileId/scan",      requireServiceToken, updateScanStatus);

export default router;